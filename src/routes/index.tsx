import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Logo } from "@/components/scale/Logo";
import { SiteFooter } from "@/components/scale/SiteFooter";
import { Mail } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  message: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Fully Resourced Leadership System" },
      {
        name: "description",
        content:
          "Sign in to the Fully Resourced Leadership System to continue your leadership journey.",
      },
      { property: "og:title", content: "Sign in — Fully Resourced Leadership System" },
      {
        property: "og:description",
        content:
          "Sign in to access your SCALE Gap Report and the 12-section Optimized Leader Guide.",
      },
      { property: "og:url", content: "https://app.getfullyresourced.com/" },
      { name: "twitter:title", content: "Sign in — Fully Resourced Leadership System" },
      {
        name: "twitter:description",
        content:
          "Sign in to access your SCALE Gap Report and the 12-section Optimized Leader Guide.",
      },
    ],
    links: [{ rel: "canonical", href: "https://app.getfullyresourced.com/" }],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const search = useSearch({ from: Route.id });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: role === "coach" ? "/coach" : "/dashboard" });
    }
  }, [session, role, loading, navigate]);

  useEffect(() => {
    if (search.email) {
      setEmail(search.email);
    }
  }, [search.email]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Redirect happens via useEffect once role loads
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--fr-signin-gradient)" }}>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl bg-white p-8 shadow-xl sm:p-10">
            <div className="mb-6 flex justify-center">
              <Logo className="h-10 w-auto" />
            </div>

            <h1 className="text-center font-display text-2xl font-semibold text-foreground">
              Sign in
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Become the leader your business needs you to be.
            </p>

            {search.message && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-rl-purple-cta/20 bg-rl-purple-cta/5 p-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-rl-purple-cta" />
                <p className="text-sm text-foreground">{search.message}</p>
              </div>
            )}

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

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-rl-purple-cta hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-rl-purple-cta hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Powered by the Fully Resourced Leadership System®
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
