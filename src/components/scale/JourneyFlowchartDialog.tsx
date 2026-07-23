import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowDown, RotateCw } from "lucide-react";

interface JourneyFlowchartDialogProps {
  open: boolean;
  onClose: () => void;
}

function Step({ label, tone = "solid" }: { label: string; tone?: "solid" | "soft" }) {
  const base =
    "w-full rounded-xl px-4 py-3 text-center text-sm font-semibold shadow-sm";
  const cls =
    tone === "solid"
      ? "bg-[#5b19bf] text-white"
      : "bg-white text-[#2a0a64] border border-[#5b19bf]/30";
  return <div className={`${base} ${cls}`}>{label}</div>;
}

function Arrow() {
  return (
    <div className="flex justify-center py-1.5 text-[#5b19bf]" aria-hidden>
      <ArrowDown className="h-5 w-5" />
    </div>
  );
}

export function JourneyFlowchartDialog({ open, onClose }: JourneyFlowchartDialogProps) {
  const cycleSteps = [
    "Lead Yourself",
    "Lead Others",
    "Lead for Results",
    "Lead Leaders",
    "Leadership Optimization Review",
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#f7f4ff] to-white">
        <div className="pt-2">
          <h2 className="text-xl font-bold text-[#2a0a64]">Your leadership journey</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's the full path you're about to walk. Every cycle repeats to keep you growing.
          </p>
        </div>

        <div className="mt-4 space-y-0">
          <Step label="GAP Report" />
          <Arrow />
          <Step label="Success Image" />
          <Arrow />
          <Step label="Success Drivers" />
          <Arrow />

          {/* Cycle group */}
          <div className="rounded-2xl border-2 border-dashed border-[#5b19bf]/40 bg-[#5b19bf]/5 p-3">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#5b19bf]">
              Leadership Optimization Cycle
            </p>
            {cycleSteps.map((s, i) => (
              <div key={s}>
                <Step label={s} tone="soft" />
                {i < cycleSteps.length - 1 && <Arrow />}
              </div>
            ))}
          </div>

          <Arrow />
          <Step label="New GAP Report" />
          <Arrow />
          <Step label="Begin Again" />

          <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#5b19bf]/10 px-3 py-2 text-xs font-medium text-[#2a0a64]">
            <RotateCw className="h-4 w-4" />
            Loops back to GAP Report — the cycle continues
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={onClose}
            className="w-full bg-[#5b19bf] text-white hover:bg-[#2a0a64]"
            size="lg"
          >
            Continue your journey
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}