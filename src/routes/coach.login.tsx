import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/coach/login")({
  head: () => ({ meta: [{ title: "Admin Login — SCALE" }] }),
  component: CoachLoginPage,
});

function CoachLoginPage() {
  const navigate = useNavigate();
  const { session, role, loading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !session) return;
    if (role === "coach") {
      navigate({ to: "/coach" });
    } else if (role) {
      // Logged in as a non-admin — drop them
      signOut().then(() => toast.error("This account is not an admin."));
    }
  }, [session, role, loading, navigate, signOut]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    // Verify coach role server-side
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user!.id);
    const isCoach = (roles ?? []).some((r) => r.role === "coach");
    if (!isCoach) {
      await supabase.auth.signOut();
      setSubmitting(false);
      toast.error("This account is not authorized for admin access.");
      return;
    }
    navigate({ to: "/coach" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-display font-bold">S</div>
          <span className="font-display text-base font-semibold">SCALE Admin</span>
        </Link>
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-2xl font-semibold text-foreground">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restricted to authorized administrators.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}