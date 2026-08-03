import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

// Runs hourly via pg_cron. For each paid member, evaluates their local time.
// Sends the action reminder email at 11am local on Tuesdays and Fridays,
// deduped by profiles.last_action_reminder_on (local YYYY-MM-DD).

type ActionDef = { section: number; label: string; actionField: string; dateField: string }
const SIMPLE_ACTIONS: ActionDef[] = [
  { section: 3, label: 'Fuel', actionField: 'fuel_execute_action', dateField: 'fuel_execute_date' },
  { section: 3, label: 'Skill Development', actionField: 'skill_execute_step', dateField: 'skill_execute_date' },
  { section: 3, label: 'Success Drivers', actionField: 'drivers_execute_action', dateField: 'drivers_execute_date' },
]
const SHARED_DATE_SECTIONS = [
  {
    section: 6,
    dateField: 'commitment_date',
    parts: [
      { label: 'Lead Yourself · Next cycle behavior', actionField: 'd1_execute' },
      { label: 'Lead Others · First action', actionField: 'd2_execute' },
      { label: 'Alignment · First action', actionField: 'd3_execute' },
      { label: 'Close a gap · First step', actionField: 'd4_execute' },
      { label: 'Principle in action', actionField: 'd5_execute' },
    ],
  },
]

function localParts(tz: string, now: Date) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      weekday: 'short',
    })
    const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]))
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    return {
      dow: weekdayMap[parts.weekday] ?? -1,
      hour: Number(parts.hour),
      dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    }
  } catch {
    return null
  }
}

function parseDateOnly(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function formatDue(d: Date, tz: string) {
  return d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
}

export const Route = createFileRoute('/api/public/hooks/action-reminders')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL!
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        // Authorize with a server-only secret. The Supabase publishable/anon key
        // is public (it ships in the browser bundle) and must never be accepted
        // as an authorization credential here.
        const cronSecret = process.env.CRON_SECRET || serviceKey
        const authHeader = request.headers.get('Authorization') ?? ''
        const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
        const provided = bearer || (request.headers.get('x-cron-secret') ?? '')
        if (!cronSecret || provided !== cronSecret) {
          return new Response('Unauthorized', { status: 401 })
        }

        const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

        // Paid members only
        const { data: subs, error: subsErr } = await admin
          .from('subscriptions')
          .select('user_id, status')
          .in('status', ['active', 'trialing'])
        if (subsErr) return Response.json({ error: subsErr.message }, { status: 500 })

        const userIds = Array.from(new Set((subs ?? []).map((s) => s.user_id).filter(Boolean))) as string[]
        if (userIds.length === 0) return Response.json({ processed: 0 })

        const { data: profiles } = await admin
          .from('profiles')
          .select('id, email, first_name, full_name, timezone, last_action_reminder_on')
          .in('id', userIds)

        const now = new Date()
        const results: { userId: string; sent: boolean; reason?: string }[] = []

        for (const p of profiles ?? []) {
          const tz = p.timezone || 'UTC'
          const lp = localParts(tz, now)
          if (!lp) {
            results.push({ userId: p.id, sent: false, reason: 'bad_tz' })
            continue
          }
          // Tue (2) and Fri (5), at 11am local
          if (lp.hour !== 11 || (lp.dow !== 2 && lp.dow !== 5)) continue
          if (p.last_action_reminder_on === lp.dateStr) continue

          // Load section data
          const { data: rows } = await admin
            .from('optimizer_section_progress')
            .select('section_number, data')
            .eq('user_id', p.id)

          const todayLocal = parseDateOnly(lp.dateStr)!
          const cutoff = new Date(todayLocal)
          cutoff.setUTCDate(cutoff.getUTCDate() + 2) // include today, +1, +2

          const pastDue: { section: number; label: string; text: string; due: string; status: 'past-due' }[] = []
          const dueSoon: { section: number; label: string; text: string; due: string; status: 'due-soon' }[] = []

          const pushAction = (section: number, label: string, text: string, dueStr: string) => {
            const due = parseDateOnly(dueStr)
            if (!text || !due) return
            const dueLabel = formatDue(due, tz)
            if (due.getTime() < todayLocal.getTime()) {
              pastDue.push({ section, label, text, due: dueLabel, status: 'past-due' })
            } else if (due.getTime() <= cutoff.getTime()) {
              dueSoon.push({ section, label, text, due: dueLabel, status: 'due-soon' })
            }
          }

          // Load action-state to skip done/closed
          const { data: stateRows } = await admin
            .from('weekly_action_state')
            .select('action_key, done_at, closed_at')
            .eq('user_id', p.id)
          const doneOrClosed = new Set(
            (stateRows ?? [])
              .filter((r) => r.done_at || r.closed_at)
              .map((r) => r.action_key as string),
          )

          for (const row of rows ?? []) {
            const sn = row.section_number as number
            const data = (row.data ?? {}) as Record<string, unknown>
            for (const def of SIMPLE_ACTIONS) {
              if (def.section !== sn) continue
              const key = `s${sn}_${def.actionField}`
              if (doneOrClosed.has(key)) continue
              pushAction(sn, def.label, String(data[def.actionField] ?? '').trim(), String(data[def.dateField] ?? '').trim())
            }
            for (const shared of SHARED_DATE_SECTIONS) {
              if (shared.section !== sn) continue
              const dateStr = String(data[shared.dateField] ?? '').trim()
              for (const part of shared.parts) {
                const key = `s${sn}_${part.actionField}`
                if (doneOrClosed.has(key)) continue
                pushAction(sn, part.label, String(data[part.actionField] ?? '').trim(), dateStr)
              }
            }
            if (sn === 4) {
              const arr = Array.isArray(data.action_rows) ? (data.action_rows as unknown[]) : []
              arr.forEach((rowUnknown, i) => {
                const r = rowUnknown as Record<string, unknown>
                const key = `s4_action_${i}`
                if (doneOrClosed.has(key)) return
                const person = String(r.person ?? '').trim()
                pushAction(
                  4,
                  `Lead Others${person ? ` · ${person}` : ''}`,
                  String(r.first_action ?? '').trim(),
                  String(r.target_date ?? '').trim(),
                )
              })
            }
          }

          if (pastDue.length === 0 && dueSoon.length === 0) {
            // Nothing to nudge — still mark today so we don't re-check dozens of times.
            await admin.from('profiles').update({ last_action_reminder_on: lp.dateStr }).eq('id', p.id)
            results.push({ userId: p.id, sent: false, reason: 'no_actions' })
            continue
          }

          if (!p.email) {
            results.push({ userId: p.id, sent: false, reason: 'no_email' })
            continue
          }

          try {
            const { sendTransactionalEmailServer } = await import('@/lib/email/send.server')
            await sendTransactionalEmailServer({
              templateName: 'action-reminder',
              recipientEmail: p.email,
              idempotencyKey: `action-reminder-${p.id}-${lp.dateStr}`,
              templateData: {
                name: p.first_name || p.full_name || null,
                pastDue,
                dueSoon,
              },
            })
            await admin.from('profiles').update({ last_action_reminder_on: lp.dateStr }).eq('id', p.id)
            results.push({ userId: p.id, sent: true })
          } catch (err) {
            console.error('action-reminder send failed', p.id, err)
            results.push({ userId: p.id, sent: false, reason: 'send_error' })
          }
        }

        return Response.json({
          processed: results.length,
          sent: results.filter((r) => r.sent).length,
        })
      },
    },
  },
})