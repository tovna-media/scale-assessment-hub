import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Loader2, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Ctx = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void };
const AICoachContext = createContext<Ctx | null>(null);

export function AICoachProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AICoachContext.Provider value={{ open, setOpen, toggle: () => setOpen(!open) }}>
      {children}
    </AICoachContext.Provider>
  );
}

export function useAICoach() {
  const ctx = useContext(AICoachContext);
  if (!ctx) throw new Error("useAICoach must be used inside AICoachProvider");
  return ctx;
}

export function AICoachLauncher({ className }: { className?: string }) {
  const { open, toggle } = useAICoach();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Fully Resourced AI Coach"
      title="Fully Resourced AI Coach"
      className={cn(
        "group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_12px_32px_rgba(91,45,142,0.45)] transition hover:scale-105",
        className,
      )}
      style={{ backgroundColor: "#5B2D8E" }}
    >
      {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-[#5B2D8E] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        Fully Resourced AI Coach
      </span>
    </button>
  );
}

export function AICoachPanel() {
  const { open, setOpen } = useAICoach();
  // Mount the iframe once per session. Start it in the background shortly
  // after mount so it's warm before the member opens the bubble.
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const start = () => setMounted(true);
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(start, { timeout: 2500 });
    } else {
      const t = window.setTimeout(start, 1200);
      return () => window.clearTimeout(t);
    }
  }, [mounted]);

  // When the panel is opened before the idle preload fires, mount immediately.
  useEffect(() => {
    if (open && !mounted) setMounted(true);
  }, [open, mounted]);

  return (
    <div
      className={cn(
        "fixed z-50 flex-col overflow-hidden rounded-2xl border border-[var(--fr-hairline)] bg-white shadow-[0_24px_60px_rgba(20,10,50,0.35)]",
        "inset-2 sm:inset-auto sm:bottom-24 sm:right-5 sm:w-[400px] sm:max-w-[calc(100vw-2.5rem)]",
        open ? "flex" : "hidden",
      )}
      style={{ maxHeight: "min(700px, calc(100vh - 2rem))", height: "min(700px, calc(100vh - 2rem))" }}
      role="dialog"
      aria-label="Fully Resourced AI Coach"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: "#5B2D8E" }}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="h-4 w-4" />
          Fully Resourced AI Coach
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-lg p-1 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden bg-white">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white text-sm text-[var(--fr-muted-ink)]">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#5B2D8E" }} />
            <p>Warming up your coach…</p>
          </div>
        )}
        {mounted && (
          <iframe
            src="https://app.coachvox.ai/avatar/mtybCyZrwODb9uv9MIJq/embed"
            allow="microphone;"
            title="Fully Resourced AI Coach"
            onLoad={() => setLoaded(true)}
            style={{ height: "100%", width: "100%", border: 0, display: "block" }}
          />
        )}
      </div>
    </div>
  );
}