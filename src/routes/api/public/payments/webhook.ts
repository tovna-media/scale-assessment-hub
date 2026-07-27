import { createFileRoute } from '@tanstack/react-router';
import { verifyWebhook, type StripeEnv } from '@/lib/stripe.server';
import type { supabaseAdmin as SupabaseAdminType } from '@/integrations/supabase/client.server';

type Admin = typeof SupabaseAdminType;

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
  admin: Admin,
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

async function handleSubscriptionUpsert(
  admin: Admin,
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
      // Send activation email only on the first transition into active (from a
      // non-active prior state). invoice.payment_succeeded handles ongoing renewals.
      if (!prevStatus || (prevStatus !== 'active' && prevStatus !== 'trialing')) {
        await sendSubscriptionEmail(userId, 'subscription-activated', {});
      } else {
        // Same-account plan change while active — treat as update
        await sendSubscriptionEmail(userId, 'subscription-updated', {
          changeType: 'change',
        });
      }
    } else if (sub.status === 'past_due') {
      await notifyGhlSubscriptionEvent(userId, 'subscription_past_due', {
        subscription_id: sub.id,
      });
    } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
      await notifyGhlSubscriptionEvent(userId, 'subscription_canceled', {
        subscription_id: sub.id,
      });
      await sendSubscriptionEmail(userId, 'subscription-canceled', {
        endsAt: isoFromUnix(periodEnd) ?? undefined,
      });
    }
  }
}

async function handleInvoicePaymentFailed(
  admin: Admin,
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
  admin: Admin,
  invoice: StripeObj & { subscription?: string; amount_paid?: number; currency?: string; billing_reason?: string },
) {
  const subId = invoice.subscription;
  if (!subId || typeof subId !== 'string') return;
  const { data: row } = await admin
    .from('subscriptions')
    .select('user_id, price_id')
    .eq('stripe_subscription_id', subId)
    .maybeSingle();
  await admin
    .from('subscriptions')
    .update({
      status: 'active',
      past_due_since: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subId);

  const r = row as { user_id?: string; price_id?: string | null } | null;
  if (!r?.user_id) return;
  // Skip the first invoice (billing_reason === 'subscription_create') — the
  // subscription-activated email already covers that. Send for renewals only.
  if (invoice.billing_reason && invoice.billing_reason === 'subscription_create') return;
  const amount = typeof invoice.amount_paid === 'number' && invoice.currency
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency.toUpperCase() })
        .format(invoice.amount_paid / 100)
    : undefined;
  await sendSubscriptionEmail(r.user_id, 'payment-succeeded', {
    amount,
  });
}

async function sendSubscriptionEmail(
  userId: string,
  templateName: 'subscription-activated' | 'subscription-canceled' | 'subscription-updated' | 'payment-succeeded',
  extra: Record<string, unknown>,
) {
  try {
    const { getUserEmailAndName, sendTransactionalEmailServer } = await import('@/lib/email/send.server');
    const { email, name } = await getUserEmailAndName(userId);
    if (!email) return;
    await sendTransactionalEmailServer({
      templateName,
      recipientEmail: email,
      idempotencyKey: `${templateName}-${userId}-${Date.now()}`,
      templateData: { name: name ?? undefined, ...extra },
    });
  } catch (e) {
    console.error('[webhook] failed to send subscription email', templateName, e);
  }
}

type CheckoutSession = StripeObj & {
  id: string;
  mode?: string;
  customer?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
};

/**
 * Founding checkout: Stripe collected the email, we create (or attach) the app
 * account here so nobody ever fills out a signup form.
 */
async function handleFoundingCheckoutCompleted(
  admin: Admin,
  session: CheckoutSession,
  env: StripeEnv,
) {
  const email = session.customer_details?.email?.trim().toLowerCase();
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
  if (!email || !subscriptionId) {
    console.error('[webhook] founding session missing email or subscription', session.id);
    return;
  }

  // Find an existing account for this email, otherwise create one.
  const { data: prof } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  let userId = (prof as { id?: string } | null)?.id ?? null;
  let isNewAccount = false;

  if (!userId) {
    const fullName = session.customer_details?.name ?? '';
    const [firstName, ...rest] = fullName.split(' ').filter(Boolean);
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName ?? '',
        last_name: rest.join(' '),
      },
    });
    if (error || !created?.user) {
      console.error('[webhook] founding account creation failed', error);
      return;
    }
    userId = created.user.id;
    isNewAccount = true;
  }

  // Stamp the userId onto Stripe so every later subscription event resolves it.
  const { createStripeClient } = await import('@/lib/stripe.server');
  const stripe = createStripeClient(env);
  await stripe.subscriptions.update(subscriptionId, {
    metadata: { userId, founding: '1' },
  });
  if (typeof session.customer === 'string') {
    await stripe.customers.update(session.customer, { metadata: { userId } });
  }

  // Grant access now (subscription.created may have arrived before we had a user).
  const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as StripeSubscription;
  await handleSubscriptionUpsert(admin, { ...sub, metadata: { userId, founding: '1' } }, env);

  // Send the sign-in link so they land in the app without a signup form.
  try {
    const appUrl = 'https://app.getfullyresourced.com';
    const { data: link } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/dashboard` },
    });
    const signInUrl = link?.properties?.action_link ?? appUrl;
    const { sendTransactionalEmailServer } = await import('@/lib/email/send.server');
    await sendTransactionalEmailServer({
      templateName: 'founding-access',
      recipientEmail: email,
      idempotencyKey: `founding-access-${session.id}`,
      templateData: { signInUrl },
    });
  } catch (e) {
    console.error('[webhook] founding sign-in email failed', e);
  }

  console.log('[webhook] founding checkout processed', { userId, isNewAccount });
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
              const session = event.data.object as CheckoutSession;
              if (session.metadata?.founding === '1') {
                await handleFoundingCheckoutCompleted(supabaseAdmin, session, env);
              }
              // Otherwise the subscription.created event does the write.
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