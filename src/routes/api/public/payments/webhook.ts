import { createFileRoute } from '@tanstack/react-router';
import { verifyWebhook, type StripeEnv } from '@/lib/stripe.server';
import {
  handleCheckoutCompleted,
  handleSubscriptionUpsert,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  type StripeObj,
  type StripeSubscription,
  type CheckoutSession,
} from '@/lib/checkout-completion.server';
import {
  handleOrgCheckoutCompleted,
  handleOrgSubscriptionUpsert,
} from '@/lib/organizations/checkout-completion.server';

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
            case 'customer.subscription.updated': {
              const sub = event.data.object as StripeSubscription;
              if (sub.metadata?.organizationId) {
                await handleOrgSubscriptionUpsert(supabaseAdmin, sub, env);
              } else {
                await handleSubscriptionUpsert(supabaseAdmin, sub, env);
              }
              break;
            }
            case 'customer.subscription.deleted': {
              const sub = event.data.object as StripeSubscription;
              if (sub.metadata?.organizationId) {
                await handleOrgSubscriptionUpsert(supabaseAdmin, { ...sub, status: 'canceled' }, env);
              } else {
                await handleSubscriptionUpsert(supabaseAdmin, { ...sub, status: 'canceled' }, env);
              }
              break;
            }
            case 'checkout.session.completed': {
              const session = event.data.object as CheckoutSession;
              // Grant access here: this is the event that fires on payment
              // success and carries the buyer email Stripe collected. Also
              // called synchronously from the checkout return page (see
              // checkout-resolve.functions.ts) for an instant redirect — this
              // webhook remains the reliable fallback if the browser never
              // returns. Both share the same idempotency check, so whichever
              // gets there first does the work and the other is a no-op.
              if (session.mode === 'subscription' && session.subscription) {
                if (session.metadata?.organizationId) {
                  await handleOrgCheckoutCompleted(supabaseAdmin, session, env);
                } else {
                  await handleCheckoutCompleted(supabaseAdmin, session, env);
                }
              } else {
                console.log('[webhook] checkout session ignored', session.id, session.mode);
              }
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
