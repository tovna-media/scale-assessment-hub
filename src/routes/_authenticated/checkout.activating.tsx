import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getSubscriptionStatus, logCheckoutReturn } from '@/lib/payments.functions';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/checkout/activating')({
  head: () => ({ meta: [{ title: 'Activating your account…' }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  component: ActivatingPage,
});

function ActivatingPage() {
  const { session_id } = Route.useSearch();
  const check = useServerFn(getSubscriptionStatus);
  const logReturn = useServerFn(logCheckoutReturn);
  const [waited, setWaited] = useState(0);
  const navigate = useNavigate();
  const loggedRef = useRef(false);

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    void logReturn({ data: { sessionId: session_id } }).catch(() => {});
  }, [logReturn, session_id]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const started = Date.now();

    async function poll() {
      if (cancelled) return;
      try {
        const status = await check({});
        if (cancelled) return;
        if (status.active) {
          navigate({ to: '/dashboard', replace: true });
          return;
        }
      } catch {
        /* keep polling */
      }
      attempts += 1;
      setWaited(Math.round((Date.now() - started) / 1000));
      const delay = attempts < 6 ? 1500 : attempts < 20 ? 3000 : 5000;
      setTimeout(poll, delay);
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [check, navigate]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-blue)]" />
      <h1 className="mt-6 font-display text-2xl font-semibold">Activating your account…</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Thanks — your payment is being confirmed. This usually takes a few seconds.
      </p>
      {waited > 20 && (
        <p className="mt-4 max-w-sm text-xs text-muted-foreground">
          Taking a little longer than usual. It's safe to leave this page — your access will be
          granted as soon as the payment confirms.
        </p>
      )}
    </main>
  );
}