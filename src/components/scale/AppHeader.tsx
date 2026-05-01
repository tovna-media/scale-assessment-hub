import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppHeader({ variant = "assessee" }: { variant?: "assessee" | "coach" }) {
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border bg-card no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to={role === "coach" ? "/coach" : "/dashboard"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-display font-bold">
            S
          </div>
          <div>
            <div className="font-display text-base font-semibold leading-none text-foreground">
              SCALE
            </div>
            <div className="text-xs text-muted-foreground">
              {variant === "coach" ? "Coach Dashboard" : "Assessment Hub"}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}