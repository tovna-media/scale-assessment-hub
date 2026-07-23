import { BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Purple gradient CTA that slides in a right-side panel with the section's
 * verbatim guide content. Mirrors GapReportPanel styling so all section-page
 * document buttons feel like one system.
 */
export function AboutSectionSheet({
  title,
  subtitle = "About this section",
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-[#5b19bf] to-[#2a0a64] text-[13px] text-white shadow-md hover:from-[#6b23d8] hover:to-[#3a1080] hover:shadow-lg"
          >
            <BookOpen className="h-4 w-4" /> {subtitle}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#433993]" /> {title}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}