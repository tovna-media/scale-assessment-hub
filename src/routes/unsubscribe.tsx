import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

type State =
  | { status: 'loading' }
  | { status: 'valid' }
  | { status: 'already' }
  | { status: 'invalid' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'error'; message: string }

function UnsubscribePage() {
  const search = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : '',
  )
  const token = search.get('token')
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    if (!token) {
      setState({ status: 'invalid' })
      return
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setState({ status: 'invalid' })
          return
        }
        if (data.valid) setState({ status: 'valid' })
        else if (data.reason === 'already_unsubscribed')
          setState({ status: 'already' })
        else setState({ status: 'invalid' })
      })
      .catch(() => setState({ status: 'invalid' }))
  }, [token])

  async function confirm() {
    if (!token) return
    setState({ status: 'submitting' })
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) setState({ status: 'success' })
      else if (data.reason === 'already_unsubscribed')
        setState({ status: 'already' })
      else setState({ status: 'error', message: data.error || 'Failed to unsubscribe' })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      })
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7f5fb',
      padding: '24px',
      fontFamily: 'Inter, Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#fff',
        borderRadius: 16,
        padding: '32px 28px',
        boxShadow: '0 10px 40px rgba(42,10,100,0.12)',
        textAlign: 'center',
      }}>
        <div style={{
          color: '#2a0a64',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 2,
          marginBottom: 16,
        }}>
          FULLY RESOURCED
        </div>
        {state.status === 'loading' && <p>Checking your unsubscribe link…</p>}
        {state.status === 'invalid' && (
          <>
            <h1 style={{ color: '#2a0a64' }}>Invalid link</h1>
            <p>This unsubscribe link is invalid or expired.</p>
          </>
        )}
        {state.status === 'already' && (
          <>
            <h1 style={{ color: '#2a0a64' }}>You're unsubscribed</h1>
            <p>This email has already been removed from our list.</p>
          </>
        )}
        {state.status === 'valid' && (
          <>
            <h1 style={{ color: '#2a0a64' }}>Unsubscribe?</h1>
            <p>You'll stop receiving app emails from Fully Resourced.</p>
            <button onClick={confirm} style={btn}>Confirm unsubscribe</button>
          </>
        )}
        {state.status === 'submitting' && <p>Unsubscribing…</p>}
        {state.status === 'success' && (
          <>
            <h1 style={{ color: '#2a0a64' }}>Done</h1>
            <p>You've been unsubscribed. You can close this tab.</p>
          </>
        )}
        {state.status === 'error' && (
          <>
            <h1 style={{ color: '#2a0a64' }}>Something went wrong</h1>
            <p>{state.message}</p>
            <button onClick={confirm} style={btn}>Try again</button>
          </>
        )}
      </div>
    </div>
  )
}

const btn: React.CSSProperties = {
  marginTop: 20,
  background: '#5b19bf',
  color: '#fff',
  border: 'none',
  padding: '12px 24px',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

const CANONICAL = 'https://app.getfullyresourced.com/unsubscribe';

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: 'Unsubscribe · Fully Resourced' },
      {
        name: 'description',
        content:
          'Manage your email preferences for the Fully Resourced Leadership System. Confirm unsubscribe from app notifications.',
      },
      { property: 'og:title', content: 'Unsubscribe · Fully Resourced' },
      {
        property: 'og:description',
        content:
          'Manage your email preferences and confirm unsubscribe from Fully Resourced app notifications.',
      },
      { property: 'og:url', content: CANONICAL },
    ],
    links: [{ rel: 'canonical', href: CANONICAL }],
  }),
})