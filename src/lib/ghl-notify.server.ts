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