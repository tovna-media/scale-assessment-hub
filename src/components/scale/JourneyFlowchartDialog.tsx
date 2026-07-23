import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileBarChart,
  Target,
  Sparkles,
  User,
  Users,
  TrendingUp,
  Crown,
  ClipboardCheck,
  FileClock,
  RotateCw,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

interface JourneyFlowchartDialogProps {
  open: boolean;
  onClose: () => void;
}

const topSteps = [
  { label: "GAP Report", icon: FileBarChart },
  { label: "Success Image", icon: Target },
  { label: "Success Drivers", icon: Sparkles },
];

const cycleSteps = [
  { label: "Lead Yourself", icon: User },
  { label: "Lead Others", icon: Users },
  { label: "Lead for Results", icon: TrendingUp },
  { label: "Lead Leaders", icon: Crown },
  { label: "Optimization Review", icon: ClipboardCheck },
];

const bottomSteps = [
  { label: "New GAP Report", icon: FileClock },
  { label: "Begin Again", icon: RotateCw },
];

function MiniStep({
  label,
  icon: Icon,
  tone = "soft",
}: {
  label: string;
  icon: React.ElementType;
  tone?: "solid" | "soft";
}) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center shadow-sm",
        tone === "solid"
          ? "border-transparent bg-[#5b19bf] text-white"
          : "border-[#5b19bf]/20 bg-white text-[#2a0a64]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-full",
          tone === "solid" ? "bg-white/20" : "bg-[#5b19bf]/10",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </div>
  );
}

function HArrow() {
  return (
    <div className="flex items-center justify-center text-[#5b19bf]" aria-hidden>
      <ArrowRight className="h-4 w-4" />
    </div>
  );
}

function VArrow({ short = false }: { short?: boolean }) {
  return (
    <div
      className={[
        "flex items-center justify-center text-[#5b19bf]",
        short ? "py-1" : "py-2",
      ].join(" ")}
      aria-hidden
    >
      <ChevronDown className="h-5 w-5" />
    </div>
  );
}

export function JourneyFlowchartDialog({ open, onClose }: JourneyFlowchartDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md sm:max-w-xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#f7f4ff] to-white p-6">
        <div className="pt-2">
          <h2 className="text-2xl font-bold text-[#2a0a64]">Your leadership journey</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow the path from insight to growth. Each cycle helps you get clearer, stronger, and more fully resourced.
          </p>
        </div>

        {/* Top row: GAP → Success Image → Success Drivers */}
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
          <MiniStep label={topSteps[0].label} icon={topSteps[0].icon} tone="solid" />
          <HArrow />
          <MiniStep label={topSteps[1].label} icon={topSteps[1].icon} tone="soft" />
          <HArrow />
          <MiniStep label={topSteps[2].label} icon={topSteps[2].icon} tone="soft" />
        </div>

        <VArrow />

        {/* Cycle group */}
        <div className="relative rounded-3xl border-2 border-dashed border-[#5b19bf]/30 bg-[#5b19bf]/[0.04] p-4 sm:p-5">
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 bg-[#f7f4ff] px-3 text-xs font-bold uppercase tracking-wide text-[#5b19bf]">
            Leadership Optimization Cycle
          </div>

          <div className="relative mx-auto grid max-w-[360px] grid-cols-3 grid-rows-3 gap-3 pt-4">
            {/* Top: Lead Yourself */}
            <div className="col-start-2 row-start-1">
              <MiniStep label={cycleSteps[0].label} icon={cycleSteps[0].icon} tone="soft" />
            </div>

            {/* Right: Lead Others */}
            <div className="col-start-3 row-start-2">
              <MiniStep label={cycleSteps[1].label} icon={cycleSteps[1].icon} tone="soft" />
            </div>

            {/* Bottom right: Lead for Results */}
            <div className="col-start-3 row-start-3">
              <MiniStep label={cycleSteps[2].label} icon={cycleSteps[2].icon} tone="soft" />
            </div>

            {/* Bottom left: Lead Leaders */}
            <div className="col-start-1 row-start-3">
              <MiniStep label={cycleSteps[3].label} icon={cycleSteps[3].icon} tone="soft" />
            </div>

            {/* Left: Optimization Review */}
            <div className="col-start-1 row-start-2">
              <MiniStep label={cycleSteps[4].label} icon={cycleSteps[4].icon} tone="soft" />
            </div>

            {/* Decorative connecting dots */}
            <div className="col-start-2 row-start-2 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#5b19bf]/20 bg-white/50" aria-hidden />
            </div>
          </div>

          {/* Cycle loop indicator */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-[#5b19bf]">
            <RotateCw className="h-4 w-4" />
            Repeats to keep you growing
          </div>
        </div>

        <VArrow />

        {/* New GAP Report → Begin Again */}
        <div className="mx-auto grid max-w-[220px] gap-2">
          {bottomSteps.map((s) => (
            <MiniStep key={s.label} label={s.label} icon={s.icon} tone="soft" />
          ))}
        </div>

        {/* Loop back to GAP Report */}
        <div className="relative mt-4 flex items-center justify-center gap-3 rounded-2xl border border-dashed border-[#5b19bf]/30 bg-[#5b19bf]/5 px-4 py-3 text-[#2a0a64]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5b19bf]/10">
            <RotateCw className="h-4 w-4 text-[#5b19bf]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#5b19bf]">The cycle continues</p>
            <p className="text-xs text-[#2a0a64]/80">Loops back to GAP Report</p>
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#5b19bf] to-[#2a0a64] text-white shadow-md hover:from-[#6b23d8] hover:to-[#3a1080] hover:shadow-lg"
            size="lg"
          >
            Continue your journey
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
