import type { StripeEnv } from '@/lib/stripe.server'
import type { supabaseAdmin as SupabaseAdminType } from '@/integrations/supabase/client.server'

export type Admin = typeof SupabaseAdminType

export type StripeObj = Record<string, unknown> & { id?: string }
export type StripeSubscription = StripeObj & {
  id: string
  customer: string
  status: string
  created?: number
  default_payment_method?: string | { id: string } | null
  cancel_at_period_end?: boolean
  current_period_start?: number | null
  current_period_end?: number | null
  metadata?: Record<string, string>
  items?: {
    data?: Array<{
      current_period_start?: number | null
      current_period_end?: number | null
      price?: {
        id?: string
        lookup_key?: string
        product?: string
        metadata?: Record<string, string>
      }
    }>
  }
}

export type CheckoutSession = StripeObj & {
  id: string
  mode?: string
  status?: string
  customer?: string | null
  subscription?: string | null
  metadata?: Record<string, string> | null
  customer_details?: { email?: string | null; name?: string | null } | null
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null
}

/** Human-readable date for member-facing emails, e.g. "September 8, 2026". */
function formatDateForEmail(iso: string | null): string | undefined {
  if (!iso) return undefined
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function priceIdOf(sub: StripeSubscription): string | null {
  const price = sub.items?.data?.[0]?.price
  return price?.lookup_key ?? price?.metadata?.lovable_external_id ?? price?.id ?? null
}

/**
 * True while a brand-new paid signup still hasn't set their password (see
 * password-setup.functions.ts). Only counts still-valid tokens — once the
 * 1-hour link expires, the member has to fall back to /forgot-password
 * instead, and that flow doesn't mark this token used, so an expired row
 * shouldn't block activation emails forever.
 */
async function hasPendingPasswordSetup(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin
    .from('password_setup_tokens')
    .select('id')
    .eq('user_id', userId)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()
  return !!data
}

async function resolveUserId(admin: Admin, sub: StripeSubscription): Promise<string | null> {
  if (sub.metadata?.userId) return sub.metadata.userId
  // Fall back to any existing row for this subscription/customer.
  const { data } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', sub.customer)
    .maybeSingle()
  return (data as { user_id?: string } | null)?.user_id ?? null
}

type VerificationOutcome = { ok: true } | { ok: false; reason: string }

// A newly-entered card and a card that was already on the Stripe customer
// before this subscription existed both show up as sub.default_payment_method
// — the only signal that distinguishes them is *when* the payment method was
// created relative to the subscription. A generous window (rather than an
// exact match) absorbs the few seconds of latency between Checkout attaching
// the payment method and the subscription object itself being created.
const NEW_CARD_WINDOW_SECONDS = 10 * 60

/**
 * $1 authorize-and-cancel card verification, run once per Stripe subscription
 * the first time it's about to be granted access. Only actually charges
 * anything (a $1 auth, immediately canceled — never captured, no Stripe fee)
 * when the payment method looks newly-entered; a card already on file from an
 * earlier subscription/checkout is treated as already verified.
 *
 * Callers race: the synchronous checkout-return resolver and up to three
 * Stripe webhook event types (checkout.session.completed,
 * customer.subscription.created/updated) can all reach this for the same
 * subscription. The stripe_subscription_id UNIQUE constraint on
 * card_verifications makes the first caller to insert a 'pending' row the
 * one that actually runs the $1 check; everyone else polls for that row to
 * resolve instead of running it again.
 */
async function ensureCardVerified(
  admin: Admin,
  env: StripeEnv,
  sub: StripeSubscription,
): Promise<VerificationOutcome> {
  const { data: existing } = await admin
    .from('card_verifications')
    .select('status')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle()
  const existingStatus = (existing as { status?: string } | null)?.status
  if (existingStatus === 'passed') return { ok: true }
  if (existingStatus === 'failed') return { ok: false, reason: 'card verification previously failed' }

  const { createStripeClient } = await import('@/lib/stripe.server')
  const stripe = createStripeClient(env)

  let pmId = typeof sub.default_payment_method === 'string'
    ? sub.default_payment_method
    : sub.default_payment_method?.id
  if (!pmId && typeof sub.customer === 'string') {
    // Checkout normally sets the subscription's own default_payment_method,
    // but fall back to the customer's default so a quirk in how a $0-due
    // trial gets set up doesn't wrongly block a real signup.
    const customer = await stripe.customers.retrieve(sub.customer)
    if (!('deleted' in customer) || !customer.deleted) {
      const invoiceDefault = customer.invoice_settings?.default_payment_method
      pmId = typeof invoiceDefault === 'string' ? invoiceDefault : invoiceDefault?.id
    }
  }
  if (!pmId) {
    // Every checkout in this app requires a card, even for a $0-due trial —
    // this shouldn't happen. Fail closed rather than grant access we can't verify.
    console.error('[card-verify] subscription has no default_payment_method', sub.id)
    return { ok: false, reason: 'no payment method on subscription' }
  }

  const pm = await stripe.paymentMethods.retrieve(pmId)
  const isNewCard =
    typeof sub.created === 'number' && Math.abs(pm.created - sub.created) <= NEW_CARD_WINDOW_SECONDS

  if (!existingStatus && !isNewCard) {
    // Reused a card Stripe already verified when it was first added — no new
    // auth needed. Record the decision so this stays a fast cache hit.
    await admin.from('card_verifications').upsert(
      {
        stripe_subscription_id: sub.id,
        user_id: sub.metadata?.userId ?? null,
        payment_method_id: pmId,
        status: 'passed',
        reason: 'existing card on file',
        checked_at: new Date().toISOString(),
      } as never,
      { onConflict: 'stripe_subscription_id' },
    )
    return { ok: true }
  }

  // Claim the verification atomically: only the first insert for this
  // subscription id succeeds, so concurrent callers don't double-run the auth.
  const { error: claimError } = await admin.from('card_verifications').insert({
    stripe_subscription_id: sub.id,
    user_id: sub.metadata?.userId ?? null,
    payment_method_id: pmId,
    status: 'pending',
  } as never)

  if (claimError) {
    // Another caller already claimed (or resolved) it — poll briefly instead
    // of running a second $1 auth against the same card.
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      const { data: row } = await admin
        .from('card_verifications')
        .select('status')
        .eq('stripe_subscription_id', sub.id)
        .maybeSingle()
      const status = (row as { status?: string } | null)?.status
      if (status === 'passed') return { ok: true }
      if (status === 'failed') return { ok: false, reason: 'card verification previously failed' }
    }
    console.error('[card-verify] timed out waiting for concurrent verification', sub.id)
    return { ok: false, reason: 'verification timed out' }
  }

  let checks: Record<string, string | null> = { cvc_check: null, address_postal_code_check: null }
  let failed = false
  let reason = ''
  try {
    const pi = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      customer: typeof sub.customer === 'string' ? sub.customer : undefined,
      payment_method: pmId,
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      expand: ['latest_charge'],
    })
    const charge = (
      pi as unknown as {
        latest_charge?: { payment_method_details?: { card?: { checks?: Record<string, string | null> } } }
      }
    ).latest_charge
    const c = charge?.payment_method_details?.card?.checks
    checks = {
      cvc_check: c?.cvc_check ?? null,
      address_postal_code_check: c?.address_postal_code_check ?? null,
    }
    // Release the hold — canceling an uncaptured PaymentIntent is free and
    // never posts a charge to the member's statement.
    if (pi.status !== 'canceled') {
      await stripe.paymentIntents.cancel(pi.id).catch((e) => {
        console.error('[card-verify] failed to cancel $1 auth hold', pi.id, e)
      })
    }
    failed = checks.cvc_check === 'fail' || checks.address_postal_code_check === 'fail'
    if (failed) {
      reason = `card checks failed: cvc_check=${checks.cvc_check} address_postal_code_check=${checks.address_postal_code_check}`
    }
  } catch (e) {
    // Couldn't confirm the $1 auth outright (declined, needs
    // re-authentication, a transient gateway error, etc). A hard decline like
    // this still often carries the actual AVS/CVC verdict on the attempted
    // PaymentIntent — go look, because the spec's block condition is
    // specifically an explicit checks "fail", not "the auth attempt errored".
    // Blocking every signup whenever the $1 auth itself can't complete would
    // make this feature reject real paying members over our own inability to
    // run a courtesy check, which is worse than the risk it's meant to catch.
    console.error('[card-verify] $1 authorization could not be confirmed', sub.id, e)
    const errPiId = (e as { payment_intent?: { id?: string } } | undefined)?.payment_intent?.id
    let sawChecks = false
    if (errPiId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(errPiId, { expand: ['latest_charge'] })
        const charge = (
          pi as unknown as {
            latest_charge?: {
              payment_method_details?: { card?: { checks?: Record<string, string | null> } }
            }
          }
        ).latest_charge
        const c = charge?.payment_method_details?.card?.checks
        if (c) {
          sawChecks = true
          checks = {
            cvc_check: c.cvc_check ?? null,
            address_postal_code_check: c.address_postal_code_check ?? null,
          }
          failed = checks.cvc_check === 'fail' || checks.address_postal_code_check === 'fail'
          if (failed) {
            reason = `card checks failed: cvc_check=${checks.cvc_check} address_postal_code_check=${checks.address_postal_code_check}`
          }
        }
        if (pi.status !== 'canceled') {
          await stripe.paymentIntents.cancel(pi.id).catch(() => {})
        }
      } catch (retrieveErr) {
        console.error('[card-verify] failed to inspect $1 auth after error', sub.id, retrieveErr)
      }
    }
    if (!sawChecks) {
      console.warn('[card-verify] $1 auth inconclusive (no checks data), letting checkout continue', sub.id)
      failed = false
    }
  }

  await admin
    .from('card_verifications')
    .update({
      status: failed ? 'failed' : 'passed',
      checks: checks as never,
      reason: failed ? reason : null,
      checked_at: new Date().toISOString(),
    } as never)
    .eq('stripe_subscription_id', sub.id)

  return failed ? { ok: false, reason } : { ok: true }
}

export async function handleSubscriptionUpsert(
  admin: Admin,
  sub: StripeSubscription,
  env: StripeEnv,
  opts?: { skipActivationEmail?: boolean },
): Promise<{ blocked: boolean; reason?: string }> {
  const userId = await resolveUserId(admin, sub)
  if (!userId) {
    // No app account yet — checkout.session.completed creates it and re-runs
    // this upsert. Skip quietly instead of failing the event.
    console.warn('[webhook] no userId yet for subscription, deferring', sub.id)
    return { blocked: false }
  }

  // The account may have been deleted from the admin page (which cancels the
  // Stripe sub and fires this event). The metadata still carries the old userId,
  // so guard against re-creating a subscriptions row for a user that no longer
  // exists — the FK would fail and we'd resend a cancellation email.
  const { data: profileExists } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (!profileExists) {
    console.warn('[webhook] user no longer exists, skipping upsert', userId, sub.id)
    return { blocked: false }
  }
  const item = sub.items?.data?.[0]
  const periodStart = item?.current_period_start ?? sub.current_period_start
  const periodEnd = item?.current_period_end ?? sub.current_period_end

  // Preserve past_due_since across updates
  const { data: existing } = await admin
    .from('subscriptions')
    .select('status, past_due_since, cancel_at_period_end')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle()
  const prev = existing as {
    status?: string
    past_due_since?: string | null
    cancel_at_period_end?: boolean | null
  } | null

  // Card verification only ever needs to run once, the first time this
  // subscription is about to be granted access (a subscriptions row for it
  // doesn't exist yet). Later events for the same subscription — renewals,
  // past_due, cancellation — skip straight through; only the initial
  // creation is gated.
  if (!prev) {
    if (sub.status === 'active' || sub.status === 'trialing') {
      const verification = await ensureCardVerified(admin, env, sub)
      if (!verification.ok) {
        console.warn('[webhook] blocking subscription — card verification failed', sub.id, verification.reason)
        try {
          const { createStripeClient } = await import('@/lib/stripe.server')
          const stripe = createStripeClient(env)
          await stripe.subscriptions.cancel(sub.id)
        } catch (e) {
          console.error('[webhook] failed to cancel unverified subscription', sub.id, e)
        }
        return { blocked: true, reason: verification.reason }
      }
    } else {
      // No subscriptions row exists yet, and this event isn't granting
      // access. If it's a customer.subscription.deleted echo of our own
      // forced cancellation above (failed card verification), there's
      // nothing to legitimately cancel or notify about — access was never
      // recorded as granted, so running the cancellation-notice logic below
      // would send a real member-canceled email and GHL tag for a signup
      // that never actually went through.
      const { data: verificationRow } = await admin
        .from('card_verifications')
        .select('status')
        .eq('stripe_subscription_id', sub.id)
        .maybeSingle()
      if ((verificationRow as { status?: string } | null)?.status === 'failed') {
        console.log('[webhook] ignoring event for card-verification-failed subscription', sub.id, sub.status)
        return { blocked: true, reason: 'card verification previously failed' }
      }
    }
  }

  let pastDueSince: string | null = prev?.past_due_since ?? null
  if (sub.status === 'past_due') {
    if (!pastDueSince) pastDueSince = new Date().toISOString()
  } else if (sub.status === 'active' || sub.status === 'trialing') {
    pastDueSince = null
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
  )

  // Notify GHL on status transitions
  const { notifyGhlSubscriptionEvent } = await import('@/lib/ghl-notify.server')
  const prevStatus = prev?.status
  if (prevStatus !== sub.status) {
    if (sub.status === 'active' || sub.status === 'trialing') {
      await notifyGhlSubscriptionEvent(userId, 'subscription_active', {
        subscription_id: sub.id,
        plan: priceIdOf(sub),
      })
      // Send activation email only on the first transition into active (from a
      // non-active prior state). invoice.payment_succeeded handles ongoing renewals.
      // One paid-activation email everywhere (founding-access) — brand-new
      // accounts get it once their password is set instead (see
      // handleCheckoutCompleted), and any founding/30-day-trial checkout
      // (new or existing account) gets it from handleCheckoutCompleted's own
      // sign-in-email step, so both skip here to avoid a duplicate.
      // The pending-token check below is the backstop for the new-account
      // skip: Stripe's own customer.subscription.created/updated webhook
      // events call this function directly (see webhook.ts) without the
      // opts flag, and can land after the account exists but before the
      // member has ever set a password.
      if (!prevStatus || (prevStatus !== 'active' && prevStatus !== 'trialing')) {
        if (!opts?.skipActivationEmail && !(await hasPendingPasswordSetup(admin, userId))) {
          await sendSubscriptionEmail(userId, 'founding-access', {
            signInUrl: 'https://app.getfullyresourced.com/dashboard',
          })
        }
      } else {
        // Same-account plan change while active — treat as update
        await sendSubscriptionEmail(userId, 'subscription-updated', {
          changeType: 'change',
        })
      }
    } else if (sub.status === 'past_due') {
      await notifyGhlSubscriptionEvent(userId, 'subscription_past_due', {
        subscription_id: sub.id,
      })
    }
  }

  // Cancellation notice fires the moment the member cancels, not when the
  // subscription actually ends. Stripe's customer portal schedules
  // cancel_at_period_end=true by default rather than canceling immediately —
  // status stays active/trialing until the period runs out, sometimes weeks
  // later. We treat "cancel_at_period_end flips on" as the cancellation event.
  // The `!prevCancelAtPeriodEnd` guard on the status-transition branch stops
  // us from tagging a second time once that scheduled cancellation actually
  // lands (status -> canceled/unpaid).
  const prevCancelAtPeriodEnd = prev?.cancel_at_period_end ?? false
  const cancelRequestedNow = (sub.cancel_at_period_end ?? false) && !prevCancelAtPeriodEnd
  const justCanceled =
    (sub.status === 'canceled' || sub.status === 'unpaid') && prevStatus !== sub.status
  if (cancelRequestedNow || (justCanceled && !prevCancelAtPeriodEnd)) {
    await notifyGhlSubscriptionEvent(userId, 'subscription_canceled', {
      subscription_id: sub.id,
    })
    const { notifyGhlTag } = await import('@/lib/ghl-notify.server')
    await notifyGhlTag({
      userId,
      event: 'subscription_canceled',
      tag: 'fully resourced cancelled',
      extra: { subscription_id: sub.id },
    })
    await sendSubscriptionEmail(userId, 'subscription-canceled', {
      endsAt: formatDateForEmail(isoFromUnix(periodEnd)),
    })
  }

  return { blocked: false }
}

export async function handleInvoicePaymentFailed(
  admin: Admin,
  invoice: StripeObj & { subscription?: string; customer?: string },
  _env: StripeEnv,
) {
  const subId = invoice.subscription
  if (!subId || typeof subId !== 'string') return
  const { data: row } = await admin
    .from('subscriptions')
    .select('user_id, past_due_since')
    .eq('stripe_subscription_id', subId)
    .maybeSingle()
  const r = row as { user_id?: string; past_due_since?: string | null } | null
  if (!r?.user_id) return
  await admin
    .from('subscriptions')
    .update({
      status: 'past_due',
      past_due_since: r.past_due_since ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subId)

  const { notifyGhlSubscriptionEvent } = await import('@/lib/ghl-notify.server')
  await notifyGhlSubscriptionEvent(r.user_id, 'subscription_past_due', {
    subscription_id: subId,
  })
}

export async function handleInvoicePaymentSucceeded(
  admin: Admin,
  invoice: StripeObj & {
    subscription?: string
    amount_paid?: number
    currency?: string
    billing_reason?: string
  },
) {
  const subId = invoice.subscription
  if (!subId || typeof subId !== 'string') return
  const { data: row } = await admin
    .from('subscriptions')
    .select('user_id, price_id')
    .eq('stripe_subscription_id', subId)
    .maybeSingle()
  await admin
    .from('subscriptions')
    .update({
      status: 'active',
      past_due_since: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subId)

  const r = row as { user_id?: string; price_id?: string | null } | null
  if (!r?.user_id) return
  // Skip the first invoice (billing_reason === 'subscription_create') — the
  // paid-activation email already covers that. Send for renewals only.
  if (invoice.billing_reason && invoice.billing_reason === 'subscription_create') return
  const amount =
    typeof invoice.amount_paid === 'number' && invoice.currency
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: invoice.currency.toUpperCase(),
        }).format(invoice.amount_paid / 100)
      : undefined
  await sendSubscriptionEmail(r.user_id, 'payment-succeeded', {
    amount,
  })
}

async function sendSubscriptionEmail(
  userId: string,
  templateName:
    | 'founding-access'
    | 'subscription-canceled'
    | 'subscription-updated'
    | 'payment-succeeded',
  extra: Record<string, unknown>,
) {
  try {
    const { getUserEmailAndName, sendTransactionalEmailServer } = await import(
      '@/lib/email/send.server'
    )
    const { email, name } = await getUserEmailAndName(userId)
    if (!email) return
    await sendTransactionalEmailServer({
      templateName,
      recipientEmail: email,
      idempotencyKey: `${templateName}-${userId}-${Date.now()}`,
      templateData: { name: name ?? undefined, ...extra },
    })
  } catch (e) {
    console.error('[webhook] failed to send subscription email', templateName, e)
  }
}

/** Resolve an auth user id for an email (profiles first, then the auth admin API). */
async function findUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  const { data: prof } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()
  const profileId = (prof as { id?: string } | null)?.id ?? null
  if (profileId) return profileId

  // Fall back to scanning auth users (profile row may be missing).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) {
      console.error('[webhook] listUsers failed', error)
      return null
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match.id
    if (data.users.length < 200) break
  }
  return null
}

/**
 * Subscription checkout completed: Stripe collected the email, we create (or
 * attach) the app account here so nobody ever fills out a signup form. Shared by
 * every in-app payment path — founding and signed-in member upgrades — so
 * account creation, access grant, and the sign-in email always run the same
 * way. The campaign is read from session metadata.
 *
 * Idempotent and safe to call from two places: the Stripe webhook (the
 * reliable, guaranteed-eventually path) and directly from the checkout
 * return page for a synchronous, no-wait redirect (see
 * checkout-resolve.functions.ts). Both share the same `subscriptions` row
 * uniqueness check below, so calling this twice for the same checkout is a
 * no-op the second time.
 */
export async function handleCheckoutCompleted(
  admin: Admin,
  session: CheckoutSession,
  env: StripeEnv,
): Promise<{ blocked: boolean }> {
  const email = session.customer_details?.email?.trim().toLowerCase()
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
  if (!email || !subscriptionId) {
    throw new Error(`checkout session missing email or subscription: ${session.id}`)
  }

  const isFounding = session.metadata?.founding === '1'
  const campaign = isFounding ? 'founding' : 'upgrade'
  console.log('[webhook] checkout start', { sessionId: session.id, subscriptionId, campaign })

  // Idempotency: if this subscription was already granted, stop here.
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()
  if ((existingSub as { user_id?: string } | null)?.user_id) {
    console.log('[webhook] checkout already processed', subscriptionId)
    return { blocked: false }
  }

  // Find an existing account for this email, otherwise create one.
  // Signed-in upgrades carry the userId in session metadata; trust that first.
  let userId = session.metadata?.userId ?? (await findUserIdByEmail(admin, email))
  let isNewAccount = false

  if (!userId) {
    const fullName = session.customer_details?.name ?? ''
    const [firstName, ...rest] = fullName.split(' ').filter(Boolean)
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName ?? '',
        last_name: rest.join(' '),
      },
    })
    if (error || !created?.user) {
      // Race / already-registered: re-resolve instead of failing.
      userId = await findUserIdByEmail(admin, email)
      if (!userId) {
        console.error('[webhook] account creation failed', error)
        throw new Error(`account creation failed for ${email}: ${error?.message ?? 'unknown'}`)
      }
    } else {
      userId = created.user.id
      isNewAccount = true
    }
  }
  console.log('[webhook] checkout user resolved', { userId, isNewAccount, campaign })

  // Preserve the real campaign when stamping the userId onto Stripe so later
  // subscription events resolve the user without mislabeling the plan.
  const campaignMeta: Record<string, string> = { userId }
  if (isFounding) campaignMeta.founding = '1'

  const { createStripeClient } = await import('@/lib/stripe.server')
  const stripe = createStripeClient(env)
  await stripe.subscriptions.update(subscriptionId, { metadata: campaignMeta })
  if (typeof session.customer === 'string') {
    await stripe.customers.update(session.customer, { metadata: { userId } })
  }

  // Grant access now (subscription.created may have arrived before we had a user).
  const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as StripeSubscription
  // Skip the generic activation email whenever a founding-access email will
  // cover it instead — brand-new accounts (once their password is set) and
  // ANY founding checkout (new or existing account) both get founding-access,
  // never both emails.
  const upsertResult = await handleSubscriptionUpsert(
    admin,
    {
      ...sub,
      customer: typeof session.customer === 'string' ? session.customer : sub.customer,
      metadata: campaignMeta,
    },
    env,
    { skipActivationEmail: isNewAccount || isFounding },
  )
  if (upsertResult.blocked) {
    // Card verification failed: no subscriptions row, no GHL tag, no
    // create-password token, no welcome email. The account itself (if newly
    // created) is left in place with no subscription — a retry with a
    // corrected card reuses it via findUserIdByEmail above.
    console.log('[webhook] checkout blocked by card verification', {
      userId,
      subscriptionId,
      campaign,
      reason: upsertResult.reason,
    })
    return { blocked: true }
  }
  console.log('[webhook] access granted', { userId, subscriptionId, campaign })

  // Tag in GHL for the specific path they paid through. Fires once per
  // checkout session (the idempotency check above skips already-processed
  // subscriptions), so this only fires on the free/no-sub -> paid
  // transition, not on renewals. Re-subscribing after a cancellation opens
  // a new checkout session and is fine to tag again.
  try {
    const { notifyGhlTag } = await import('@/lib/ghl-notify.server')
    const subscribeTag = isFounding
      ? 'fully resourced subscribed-30-day-trial'
      : 'fully resourced subscribed - standard'
    await notifyGhlTag({
      userId,
      email,
      fullName: session.customer_details?.name ?? undefined,
      event: `subscribe_${campaign}`,
      tag: subscribeTag,
      extra: { subscription_id: subscriptionId, campaign },
    })
  } catch (e) {
    console.error('[webhook] GHL subscribe tag failed', e)
  }

  // Brand-new accounts have no password yet. Instead of a magic link, hand
  // them a one-time token to set their own password at /set-password/:token.
  // The paid welcome email fires once that password is actually set (see
  // src/lib/password-setup.functions.ts) so it lines up with them having a
  // real, loggable-into account — not here, on payment.
  if (isNewAccount) {
    try {
      const bytes = new Uint8Array(32)
      crypto.getRandomValues(bytes)
      const token = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      // 1 hour, matching Supabase's own default magic-link/OTP expiry.
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const { error: tokenError } = await admin.from('password_setup_tokens').insert({
        token,
        user_id: userId,
        checkout_session_id: session.id,
        email,
        expires_at: expiresAt,
      } as never)
      if (tokenError) {
        console.error('[webhook] password setup token insert failed', tokenError)
      } else {
        console.log('[webhook] password setup token issued', { userId })
      }
    } catch (e) {
      console.error('[webhook] password setup token failed', e)
    }
    console.log('[webhook] checkout processed', { userId, isNewAccount, campaign })
    return { blocked: false }
  }

  // Existing account: they already have a password and can log in normally.
  // Skip the sign-in email for signed-in member upgrades (they already have a
  // session); founding buyers who checked out anonymously with an email that
  // already has an account still need a way in.
  if (!isFounding) {
    console.log('[webhook] existing member upgrade, no sign-in email needed', { userId })
    return { blocked: false }
  }
  try {
    const appUrl = 'https://app.getfullyresourced.com'
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/dashboard` },
    })
    if (linkError) console.error('[webhook] generateLink failed', linkError)
    const signInUrl = link?.properties?.action_link ?? appUrl
    const templateName = 'founding-access'
    const { sendTransactionalEmailServer } = await import('@/lib/email/send.server')
    await sendTransactionalEmailServer({
      templateName,
      recipientEmail: email,
      idempotencyKey: `${templateName}-${session.id}`,
      templateData: { signInUrl, name: session.customer_details?.name ?? undefined },
    })
    console.log('[webhook] sign-in email queued', { email, campaign })
  } catch (e) {
    console.error('[webhook] sign-in email failed', e)
  }

  console.log('[webhook] checkout processed', { userId, isNewAccount, campaign })
  return { blocked: false }
}
