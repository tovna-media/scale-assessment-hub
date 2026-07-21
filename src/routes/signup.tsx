import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { logFunnelEvent } from "@/lib/funnel.functions";
import { useServerFn } from "@tanstack/react-start";
import { sendTransactionalEmail } from "@/lib/email/send";
import { Logo } from "@/components/scale/Logo";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Fully Resourced Leadership System" },
      {
        name: "description",
        content: "Create a Fully Resourced account to take the three SCALE assessments and generate your personalized leadership Gap Report.",
      },
      { property: "og:title", content: "Create your account — Fully Resourced Leadership System" },
      { property: "og:description", content: "Start the three SCALE assessments and get a personalized leadership Gap Report from coach Rich Lohman." },
      { property: "og:url", content: "https://scale.richlohman.com/signup" },
      { name: "twitter:title", content: "Create your account — Fully Resourced Leadership System" },
      { name: "twitter:description", content: "Start the three SCALE assessments and get a personalized leadership Gap Report." },
    ],
    links: [{ rel: "canonical", href: "https://scale.richlohman.com/signup" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const logEvent = useServerFn(logFunnelEvent);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && session && !success) {
      navigate({ to: role === "coach" ? "/coach" : "/dashboard" });
    }
  }, [session, role, loading, navigate, success]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/dashboard`;
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSuccess(true);
    toast.success("Account created. Welcome to SCALE.");
    // Fire-and-forget funnel event.
    void logEvent({ data: { event_type: "signed_up" } }).catch(() => {});
    // Fire-and-forget welcome email.
    void sendTransactionalEmail({
      templateName: "welcome",
      recipientEmail: email,
      idempotencyKey: `welcome-${email}`,
      templateData: { name: firstName || fullName || undefined },
    }).catch(() => {});
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
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Become the leader your business needs you to be.
          </p>
          {success ? (
            <div className="mt-8 space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rl-purple-cta/10">
                <Mail className="h-8 w-8 text-rl-purple-cta" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Account created successfully
                </h2>
                <p className="text-sm text-muted-foreground">
                  Check your email at <strong className="text-foreground">{email}</strong> to activate your account. Once activated, you can sign in and begin your SCALE assessment.
                </p>
              </div>
              <Button
                asChild
                className="w-full bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
              >
                <Link to="/">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                  disabled={submitting}
                >
                  {submitting ? "Creating account…" : "Create account"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/" className="font-medium text-rl-purple-cta hover:underline">
                  Sign in
                </Link>
              </p>
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