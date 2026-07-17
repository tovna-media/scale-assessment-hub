import { PlayCircle } from "lucide-react";

/**
 * Persistent video placeholder pinned at the top of every Optimized Leader
 * Guide section. One video per section — it does not change as the member
 * moves between parts/steps/dashboards. Real videos will replace this
 * placeholder later.
 */
export function SectionVideo({ sectionNumber, sectionTitle }: { sectionNumber: number; sectionTitle: string }) {
  return (
    <div className="mb-6 flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-[#433993]/30 bg-gradient-to-br from-[#f6f2ff] to-white text-center">
      <div className="flex flex-col items-center gap-2 px-4 py-6">
        <PlayCircle className="h-10 w-10 text-[#433993]" />
        <p className="text-sm font-semibold text-[#433993]">
          Section {sectionNumber} video — coming soon
        </p>
        <p className="text-xs text-muted-foreground">
          Rich will walk you through {sectionTitle}.
        </p>
      </div>
    </div>
  );
}