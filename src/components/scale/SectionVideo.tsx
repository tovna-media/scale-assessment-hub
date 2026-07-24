import { PlayCircle } from "lucide-react";

interface SectionVideoProps {
  sectionNumber: number;
  sectionTitle: string;
  videoUrl?: string;
}

/**
 * Persistent video embed pinned at the top of every Optimized Leader Guide
 * section. One video per section — it does not change as the member moves
 * between parts/steps/dashboards. When no videoUrl is provided, a
 * placeholder is shown.
 */
export function SectionVideo({ sectionNumber, sectionTitle, videoUrl }: SectionVideoProps) {
  if (!videoUrl) {
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

  return (
    <div className="mb-6 aspect-video w-full overflow-hidden rounded-2xl border border-[#433993]/20 bg-black shadow-sm">
      <iframe
        src={videoUrl}
        title={`Section ${sectionNumber} video — ${sectionTitle}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full"
        loading="lazy"
      />
    </div>
  );
}