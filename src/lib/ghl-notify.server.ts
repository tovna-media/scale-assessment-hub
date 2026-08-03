import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { assertSafeWebhookUrl } from '@/lib/webhook-url';

type SubscriptionEvent =
  | 'subscription_active'
  | 'subscription_past_due'
  | 'subscription_canceled';

export async function notifyGhlSubscriptionEvent(
  userId: string,
  event: SubscriptionEvent,
  extra: Record<string, unknown> = {},
) {
  try {
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('ghl_enabled, ghl_webhook_url')
      .eq('id', 1)
      .maybeSingle();
    if (!settings?.ghl_enabled || !settings.ghl_webhook_url) return;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, full_name, email, phone')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return;

    const payload = {
      event,
      first_name: profile.first_name,
      last_name: profile.last_name,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      occurred_at: new Date().toISOString(),
      ...extra,
    };
    const url = assertSafeWebhookUrl(settings.ghl_webhook_url);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error('[GHL] subscription webhook non-OK', event, res.status);
  } catch (e) {
    console.error('[GHL] subscription webhook failed', event, e);
  }
}

/**
 * Same webhook/payload shape as notifyGhlSubscriptionEvent, but for
 * one-off contact tagging events (signup, subscribe-path, cancellation).
 * Contact fields can be passed directly (e.g. before an account is deleted,
 * or before a profiles row exists yet) or looked up by userId.
 */
export async function notifyGhlTag(params: {
  userId?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  phone?: string | null;
  event: string;
  tag: string;
  extra?: Record<string, unknown>;
}) {
  try {
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('ghl_enabled, ghl_webhook_url')
      .eq('id', 1)
      .maybeSingle();
    if (!settings?.ghl_enabled || !settings.ghl_webhook_url) return;

    let contact = {
      first_name: params.firstName ?? null,
      last_name: params.lastName ?? null,
      full_name: params.fullName ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
    };
    if (params.userId && !contact.email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, full_name, email, phone')
        .eq('id', params.userId)
        .maybeSingle();
      if (profile) contact = profile;
    }
    if (!contact.email) return;

    const payload = {
      event: params.event,
      tag: params.tag,
      first_name: contact.first_name,
      last_name: contact.last_name,
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      occurred_at: new Date().toISOString(),
      ...params.extra,
    };
    const url = assertSafeWebhookUrl(settings.ghl_webhook_url);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error('[GHL] tag webhook non-OK', params.tag, res.status);
  } catch (e) {
    console.error('[GHL] tag webhook failed', params.tag, e);
  }
}