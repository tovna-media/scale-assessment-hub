import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordCard } from "@/components/scale/ChangePasswordCard";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Password & Security — Fully Resourced" }] }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">
          Account
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fr-ink)]">
          Password &amp; Security
        </h2>
        <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
          Manage how you sign in and keep your account secure.
        </p>
      </div>

      <section aria-labelledby="password-heading">
        <div className="mb-3">
          <h3 id="password-heading" className="text-lg font-semibold text-[var(--fr-ink)]">
            Password
          </h3>
          <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
            Update the password you use to sign in.
          </p>
        </div>
        <ChangePasswordCard />
      </section>
    </div>
  );
}
