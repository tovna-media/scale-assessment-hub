import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Get Fully Resourced'
const SENDER_DOMAIN = 'notify.getfullyresourced.com'
const FROM_DOMAIN = 'getfullyresourced.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface ServerSendInput {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

/**
 * Server-side transactional email sender. Uses the service-role admin client
 * to enqueue directly — safe to call from webhooks and other unauthenticated
 * server contexts. NEVER import this from client code.
 */
export async function sendTransactionalEmailServer(input: ServerSendInput) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const template = TEMPLATES[input.templateName]
  if (!template) throw new Error(`Template '${input.templateName}' not found`)

  const recipient = template.to || input.recipientEmail
  if (!recipient) throw new Error('recipientEmail is required')

  const messageId = crypto.randomUUID()
  const idempotencyKey = input.idempotencyKey || messageId
  const normalizedEmail = recipient.toLowerCase()

  // Suppression check
  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (suppressed) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: 'suppressed',
    })
    return { success: false, reason: 'email_suppressed' as const }
  }

  // Unsubscribe token (get or create)
  let unsubscribeToken: string
  const { data: existingToken } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    unsubscribeToken = generateToken()
    await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true },
      )
    const { data: stored } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    if (!stored) throw new Error('Failed to store unsubscribe token')
    unsubscribeToken = stored.token
  } else {
    return { success: false, reason: 'email_suppressed' as const }
  }

  const data = input.templateData || {}
  const element = React.createElement(template.component, data)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(data) : template.subject

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: input.templateName,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: input.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (error) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    throw new Error(`Failed to enqueue email: ${error.message}`)
  }

  return { success: true as const, messageId }
}

/** Look up an auth user's email + display name by id. */
export async function getUserEmailAndName(userId: string): Promise<{ email: string | null; name: string | null }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = authUser?.user?.email ?? null
  const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>
  const name = (meta.full_name as string | undefined)
    ?? (meta.name as string | undefined)
    ?? (meta.first_name as string | undefined)
    ?? null
  return { email, name }
}