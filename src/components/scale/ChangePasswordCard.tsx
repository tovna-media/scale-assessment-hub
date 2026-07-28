import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Password change card. Re-authenticates with the current password before
 * updating, since Supabase's updateUser does not verify it on its own.
 * Shared between the Password & Security screen and any future consumer.
 */
export function ChangePasswordCard() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setChangingPassword(true);
    // Supabase's updateUser does not verify the current password, so
    // re-authenticate first to confirm the member entered it correctly.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      toast.error("Old password is incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  }

  return (
    <form
      onSubmit={handleChangePassword}
      className="rounded-2xl border border-[var(--fr-hairline)] bg-white p-6 shadow-[var(--shadow-card)]"
    >
      <div className="grid gap-4">
        <div>
          <Label htmlFor="old_password">Old password</Label>
          <Input
            id="old_password"
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="new_password">New password</Label>
          <Input
            id="new_password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--fr-muted-ink)]">
        Make sure it's at least 8 characters.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-[var(--rl-purple)] hover:underline"
        >
          I forgot my password
        </Link>
        <Button type="submit" disabled={changingPassword}>
          {changingPassword ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
