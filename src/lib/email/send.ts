import { supabase } from '@/integrations/supabase/client'

export interface SendTransactionalEmailInput {
  templateName: 'welcome' | 'gap-report-ready' | 'notification' | (string & {})
  recipientEmail: string
  /** Unique per triggering event — prevents duplicate sends on retry. */
  idempotencyKey: string
  templateData?: Record<string, unknown>
}

/**
 * Sends an app email through the Lovable transactional email route.
 * Requires an authenticated Supabase session.
 */
export async function sendTransactionalEmail(input: SendTransactionalEmailInput) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You must be signed in to send email')

  const res = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Email send failed [${res.status}]: ${text}`)
  }
  return res.json() as Promise<{ success: boolean; messageId?: string }>
}
