import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Edit profile — Fully Resourced" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as {
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          full_name?: string | null;
        } | null;
        setFirstName(p?.first_name ?? "");
        setLastName(p?.last_name ?? "");
        setPhone(p?.phone ?? "");
        setLoading(false);
      });
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        full_name: full || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-[var(--fr-muted-ink)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rl-purple)]">
          Account
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--fr-ink)]">
          Edit profile
        </h2>
        <p className="mt-1 text-sm text-[var(--fr-muted-ink)]">
          Update your name and phone. Email is tied to your login.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-[var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
