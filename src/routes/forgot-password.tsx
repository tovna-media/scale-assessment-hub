import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/scale/Logo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Fully Resourced Leadership System" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Check your email for the reset link.");
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--fr-signin-gradient)" }}
    >
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-6 flex justify-center">
            <Logo className="h-10 w-auto" />
          </div>

          <h1 className="text-center font-display text-2xl font-semibold text-foreground">
            Reset password
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>

          {sent ? (
            <div className="mt-8 space-y-5">
              <p className="text-center text-sm text-muted-foreground">
                If an account exists for that email, you'll receive a reset
                link shortly.
              </p>
              <Button
                asChild
                className="w-full bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
              >
                <Link to="/">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@company.com"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}

          {!sent && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                to="/"
                className="font-medium text-rl-purple-cta hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by the Fully Resourced Leadership System®
        </p>
      </div>
    </div>
  );
}
