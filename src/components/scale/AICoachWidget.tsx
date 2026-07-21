import { createContext, useContext, useState, type ReactNode } from "react";
import { MessageCircle, X } from "lucide-react";
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
  if (!open) return null;
  return (
    <div
      className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--fr-hairline)] bg-white shadow-[0_24px_60px_rgba(20,10,50,0.35)]
        inset-2 sm:inset-auto sm:bottom-24 sm:right-5 sm:w-[400px] sm:max-w-[calc(100vw-2.5rem)]"
      style={{ maxHeight: "min(700px, calc(100vh - 2rem))", height: "min(700px, calc(100vh - 2rem))" }}
      role="dialog"
      aria-label="Fully Resourced AI Coach"
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
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          src="https://app.coachvox.ai/avatar/mtybCyZrwODb9uv9MIJq/embed"
          allow="microphone;"
          title="Fully Resourced AI Coach"
          style={{ height: "100%", width: "100%", border: 0, display: "block" }}
        />
      </div>
    </div>
  );
}