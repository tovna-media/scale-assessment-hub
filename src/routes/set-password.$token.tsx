import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPasswordSetupInfo, setInitialPassword } from "@/lib/password-setup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/scale/Logo";

export const Route = createFileRoute("/set-password/$token")({
  head: () => ({ meta: [{ title: "Set your password — Fully Resourced" }] }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const fetchInfo = useServerFn(getPasswordSetupInfo);
  const submitPassword = useServerFn(setInitialPassword);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchInfo({ data: { token } });
      if (cancelled) return;
      if (result.ok) {
        setEmail(result.email);
      } else {
        setLinkError(result.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchInfo, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const result = await submitPassword({ data: { token, password: newPassword } });
    if (!result.ok) {
      setSubmitting(false);
      toast.error(result.error);
      return;
    }
    // Log them in with the password they just chose — same destination the
    // old magic link used to land them on.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email,
      password: newPassword,
    });
    setSubmitting(false);
    if (signInError) {
      toast.error("Password set, but sign-in failed. Please sign in from the login page.");
      navigate({ to: "/" });
      return;
    }
    navigate({ to: "/dashboard" });
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

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : linkError ? (
            <div className="space-y-5">
              <h1 className="text-center font-display text-2xl font-semibold text-foreground">
                Link expired
              </h1>
              <p className="text-center text-sm text-muted-foreground">{linkError}</p>
              <Button
                asChild
                className="w-full bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
              >
                <Link to="/forgot-password">Get a new link</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-center font-display text-2xl font-semibold text-foreground">
                You're in. Set your password.
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Your membership is active. Choose a password to finish setting up your account.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email ?? ""}
                    disabled
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Make sure it's at least 8 characters.
                </p>
                <Button
                  type="submit"
                  className="w-full bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                  disabled={submitting}
                >
                  {submitting ? "Setting up…" : "Set password and continue"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by the Fully Resourced Leadership System®
        </p>
      </div>
    </div>
  );
}
