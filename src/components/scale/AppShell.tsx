import { type ReactNode, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  RefreshCw,
  TrendingUp,
  Sparkles,
  MessageCircle,
  BookOpen,
  User as UserIcon,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  CreditCard,
  Zap,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getSubscriptionStatus } from "@/lib/payments.functions";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/scale/Logo";
import { SiteFooter } from "@/components/scale/SiteFooter";
import {
  AICoachProvider,
  AICoachLauncher,
  AICoachPanel,
  useAICoach,
} from "@/components/scale/AICoachWidget";
import { PlansDialogProvider, usePlansDialog } from "@/components/PlansDialog";

type NavItem = {
  label: string;
  icon: typeof Home;
  to?: string;
  match?: string;
  href?: string;
  soon?: boolean;
  action?: "open-ai-coach";
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: Home, match: "/dashboard" },
  { to: "/cycle", label: "My Cycle", icon: RefreshCw, match: "/cycle" },
  { to: "/performance", label: "My Progress", icon: TrendingUp, match: "/performance" },
  { label: "Fully Resourced AI Coach", icon: MessageCircle, action: "open-ai-coach" },
  { label: "The Book", icon: BookOpen, soon: true },
];

function useDisplayName() {
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name,last_name,full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as {
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
        } | null;
        const composed = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
        setName(composed || p?.full_name || null);
      });
  }, [user]);
  return name;
}

function initialsOf(name: string | null, email: string | null | undefined) {
  const src = name || email || "";
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AppShell({ pageTitle, children }: { pageTitle: string; children: ReactNode }) {
  return (
    <AICoachProvider>
      <AppShellWithSub pageTitle={pageTitle}>{children}</AppShellWithSub>
    </AICoachProvider>
  );
}

function AppShellWithSub({ pageTitle, children }: { pageTitle: string; children: ReactNode }) {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const checkSub = useServerFn(getSubscriptionStatus);
  useEffect(() => {
    if (!user) return;
    void checkSub({})
      .then((s) => setSubscribed(Boolean(s.active)))
      .catch(() => setSubscribed(false));
  }, [user, checkSub]);
  return (
    <PlansDialogProvider subscribed={subscribed}>
      <AppShellInner pageTitle={pageTitle} subscribed={subscribed}>
        {children}
      </AppShellInner>
    </PlansDialogProvider>
  );
}

function AppShellInner({
  pageTitle,
  children,
  subscribed,
}: {
  pageTitle: string;
  children: ReactNode;
  subscribed: boolean;
}) {
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const name = useDisplayName();
  const initials = initialsOf(name, user?.email);
  const aiCoach = useAICoach();
  const plansDialog = usePlansDialog();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  function handleManageBilling() {
    setMenuOpen(false);
    plansDialog.open();
  }

  const sidebarContent = (
    <div
      className="flex h-full flex-col text-white"
      style={{
        background: "linear-gradient(180deg, var(--fr-sidebar-from) 0%, var(--fr-sidebar-to) 100%)",
      }}
    >
      <div className="flex items-center gap-3 px-6 py-6">
        <Logo className="h-10 w-10 rounded-xl" />
        <span className="text-base font-semibold tracking-tight">Fully Resourced</span>
      </div>
      <nav className="mt-2 flex-1 px-3">
        {NAV.map((item) => {
          const isActive = Boolean(item.match && currentPath.startsWith(item.match));
          const Icon = item.icon;
          const commonCls = cn(
            "mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
            isActive
              ? "bg-[var(--rl-purple)] text-white shadow-[0_8px_24px_rgba(91,25,191,0.45)]"
              : "text-white/75 hover:bg-white/5 hover:text-white",
          );
          if (item.action === "open-ai-coach") {
            // Visible to everyone. Paid members open the coach; free members
            // are sent to the plans/upgrade modal and never mount the embed.
            const locked = !subscribed;
            return (
              <button
                key={item.label}
                type="button"
                title="Fully Resourced AI Coach"
                onClick={() => {
                  setMobileOpen(false);
                  if (locked) plansDialog.open();
                  else aiCoach.setOpen(true);
                }}
                className={cn(commonCls, "w-full text-left")}
              >
                <Icon style={{ width: 18, height: 18 }} />
                <span className="flex-1">{item.label}</span>
                {locked && (
                  <Lock style={{ width: 14, height: 14 }} className="shrink-0 text-white/60" />
                )}
              </button>
            );
          }
          if (item.soon) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  toast(`${item.label} — coming soon`);
                }}
                className={cn(commonCls, "w-full text-left opacity-80")}
              >
                <Icon style={{ width: 18, height: 18 }} />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                  Soon
                </span>
              </button>
            );
          }
          return (
            <Link
              key={item.label}
              to={item.to!}
              onClick={() => setMobileOpen(false)}
              className={commonCls}
            >
              <Icon style={{ width: 18, height: 18 }} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-3 py-3">
        {!subscribed && (
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              plansDialog.open();
            }}
            className="mb-2 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(91,45,142,0.45)] transition hover:brightness-110"
            style={{ background: "#5B2D8E" }}
          >
            <Zap style={{ width: 16, height: 16 }} />
            Upgrade Now
          </button>
        )}
        {role === "coach" && (
          <Link
            to="/coach"
            className="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/75 hover:bg-white/5 hover:text-white"
          >
            <Shield style={{ width: 18, height: 18 }} />
            Coach dashboard
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebarContent}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">{sidebarContent}</div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[var(--fr-hairline)] bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                className="rounded-lg p-2 text-[var(--fr-ink)] hover:bg-[var(--fr-surface)] lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-semibold text-[var(--fr-ink)]">{pageTitle}</h1>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-[var(--fr-ink)] transition hover:bg-[var(--fr-surface)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--rl-purple-deep)] text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden sm:inline">{name || user?.email}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[var(--fr-hairline)] bg-white p-2 shadow-[var(--shadow-card)]">
                  <div className="px-3 py-2 text-xs text-[var(--fr-muted-ink)]">{user?.email}</div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--fr-ink)] hover:bg-[var(--fr-surface)]"
                  >
                    <UserIcon className="h-4 w-4" />
                    Edit profile
                  </Link>
                  <Link
                    to="/security"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--fr-ink)] hover:bg-[var(--fr-surface)]"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Password &amp; Security
                  </Link>
                  <button
                    type="button"
                    onClick={handleManageBilling}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--fr-ink)] hover:bg-[var(--fr-surface)]"
                  >
                    <CreditCard className="h-4 w-4" />
                    Manage billing
                  </button>
                  <div className="my-1 border-t border-[var(--fr-hairline)]" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--fr-ink)] hover:bg-[var(--fr-surface)]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <SiteFooter />
      </div>
      {subscribed && <AICoachLauncher />}
      {subscribed && <AICoachPanel />}
    </div>
  );
}
