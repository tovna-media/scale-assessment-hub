import { createFileRoute } from '@tanstack/react-router';
import { verifyWebhook, type StripeEnv } from '@/lib/stripe.server';

type StripeObj = Record<string, unknown> & { id?: string };
type StripeSubscription = StripeObj & {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_start?: number | null;
  current_period_end?: number | null;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      current_period_start?: number | null;
      current_period_end?: number | null;
      price?: {
        id?: string;
        lookup_key?: string;
        product?: string;
        metadata?: Record<string, string>;
      };
    }>;
  };
};

function isoFromUnix(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;
}

function priceIdOf(sub: StripeSubscription): string | null {
  const price = sub.items?.data?.[0]?.price;
  return price?.lookup_key ?? price?.metadata?.lovable_external_id ?? price?.id ?? null;
}

async function resolveUserId(
  admin: ReturnType<typeof getAdmin>,
  sub: StripeSubscription,
): Promise<string | null> {
  if (sub.metadata?.userId) return sub.metadata.userId;
  // Fall back to any existing row for this subscription/customer.
  const { data } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', sub.customer)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

let _admin: ReturnType<typeof createAdmin> | null = null;
function createAdmin() {
  // Load inside the handler to keep server-only import out of the client graph.
  // Called from route module scope only via the getter below.
  throw new Error('use getAdmin() inside the handler');
}
function getAdmin() {
  return _admin!;
}

async function handleSubscriptionUpsert(
  admin: ReturnType<typeof getAdmin>,
  sub: StripeSubscription,
  env: StripeEnv,
) {
  const userId = await resolveUserId(admin, sub);
  if (!userId) {
    console.error('[webhook] no userId for subscription', sub.id);
    return;
  }
  const item = sub.items?.data?.[0];
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;

  // Preserve past_due_since across updates
  const { data: existing } = await admin
    .from('subscriptions')
    .select('status, past_due_since')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle();
  const prev = existing as { status?: string; past_due_since?: string | null } | null;

  let pastDueSince: string | null = prev?.past_due_since ?? null;
  if (sub.status === 'past_due') {
    if (!pastDueSince) pastDueSince = new Date().toISOString();
  } else if (sub.status === 'active' || sub.status === 'trialing') {
    pastDueSince = null;
  }

  await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer,
      product_id: item?.price?.product ?? null,
      price_id: priceIdOf(sub),
      status: sub.status,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      current_period_start: isoFromUnix(periodStart),
      current_period_end: isoFromUnix(periodEnd),
      past_due_since: pastDueSince,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );

  // Notify GHL on status transitions
  const { notifyGhlSubscriptionEvent } = await import('@/lib/ghl-notify.server');
  const prevStatus = prev?.status;
  if (prevStatus !== sub.status) {
    if (sub.status === 'active' || sub.status === 'trialing') {
      await notifyGhlSubscriptionEvent(userId, 'subscription_active', {
        subscription_id: sub.id,
        plan: priceIdOf(sub),
      });
    } else if (sub.status === 'past_due') {
      await notifyGhlSubscriptionEvent(userId, 'subscription_past_due', {
        subscription_id: sub.id,
      });
    } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
      await notifyGhlSubscriptionEvent(userId, 'subscription_canceled', {
        subscription_id: sub.id,
      });
    }
  }
}

async function handleInvoicePaymentFailed(
  admin: ReturnType<typeof getAdmin>,
  invoice: StripeObj & { subscription?: string; customer?: string },
  _env: StripeEnv,
) {
  const subId = invoice.subscription;
  if (!subId || typeof subId !== 'string') return;
  const { data: row } = await admin
    .from('subscriptions')
    .select('user_id, past_due_since')
    .eq('stripe_subscription_id', subId)
    .maybeSingle();
  const r = row as { user_id?: string; past_due_since?: string | null } | null;
  if (!r?.user_id) return;
  await admin
    .from('subscriptions')
    .update({
      status: 'past_due',
      past_due_since: r.past_due_since ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subId);

  const { notifyGhlSubscriptionEvent } = await import('@/lib/ghl-notify.server');
  await notifyGhlSubscriptionEvent(r.user_id, 'subscription_past_due', {
    subscription_id: subId,
  });
}

async function handleInvoicePaymentSucceeded(
  admin: ReturnType<typeof getAdmin>,
  invoice: StripeObj & { subscription?: string },
) {
  const subId = invoice.subscription;
  if (!subId || typeof subId !== 'string') return;
  await admin
    .from('subscriptions')
    .update({
      status: 'active',
      past_due_since: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subId);
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;

        let event: { id: string; type: string; data: { object: unknown } };
        try {
          event = await verifyWebhook(request, env);
        } catch (e) {
          console.error('[webhook] verify failed', e);
          return new Response('Invalid signature', { status: 400 });
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        _admin = supabaseAdmin;

        // Idempotency: reject duplicate event ids
        const { error: insertErr } = await supabaseAdmin
          .from('stripe_events')
          .insert({ event_id: event.id, type: event.type } as never);
        if (insertErr) {
          // Duplicate — already processed
          console.log('[webhook] duplicate event skipped', event.id, event.type);
          return Response.json({ received: true, duplicate: true });
        }

        try {
          switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
              await handleSubscriptionUpsert(
                supabaseAdmin,
                event.data.object as StripeSubscription,
                env,
              );
              break;
            case 'customer.subscription.deleted':
              await handleSubscriptionUpsert(
                supabaseAdmin,
                { ...(event.data.object as StripeSubscription), status: 'canceled' },
                env,
              );
              break;
            case 'checkout.session.completed': {
              // Subscription checkout — the subscription.created event does the write.
              // Nothing to do here beyond acknowledging.
              break;
            }
            case 'invoice.payment_failed':
              await handleInvoicePaymentFailed(
                supabaseAdmin,
                event.data.object as StripeObj & { subscription?: string; customer?: string },
                env,
              );
              break;
            case 'invoice.payment_succeeded':
              await handleInvoicePaymentSucceeded(
                supabaseAdmin,
                event.data.object as StripeObj & { subscription?: string },
              );
              break;
            default:
              console.log('[webhook] unhandled event', event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error('[webhook] handler error', event.type, e);
          // Delete the dedup row so Stripe can retry
          await supabaseAdmin.from('stripe_events').delete().eq('event_id', event.id);
          return new Response('Handler error', { status: 500 });
        }
      },
    },
  },
});