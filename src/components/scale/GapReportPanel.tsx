import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BookOpen, ExternalLink, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

/**
 * Persistent "Access your gap report here" CTA rendered inside every
 * Optimized Leader Guide section, just below the section bar. Self-loads
 * the member's most recent gap report so callers don't need to fetch it.
 */
export function GapReportPanel({ className }: { className?: string }) {
  const { user } = useAuth();
  const [md, setMd] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("assessment_sessions")
      .select("gap_report, created_at")
      .eq("user_id", user.id)
      .not("gap_report", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const report = (data ?? [])[0]?.gap_report as string | null | undefined;
        setMd(report ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className={className}>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-[#5b19bf] to-[#2a0a64] text-[13px] text-white shadow-md hover:from-[#6b23d8] hover:to-[#3a1080] hover:shadow-lg"
          >
            <BookOpen className="h-4 w-4" /> Access your full SCALE Gap Report
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#433993]" /> Your latest GAP Report
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {md ? (
              <MiniMarkdown text={md} />
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                You don't have a GAP Report yet.
                <div className="mt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/dashboard">
                      Go to dashboard <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="prose prose-sm max-w-none text-foreground">
      {lines.map((l, i) => {
        if (l.startsWith("### ")) return <h4 key={i} className="mt-4 text-sm font-semibold text-foreground">{l.slice(4)}</h4>;
        if (l.startsWith("## ")) return <h3 key={i} className="mt-5 text-base font-semibold text-foreground">{l.slice(3)}</h3>;
        if (l.startsWith("# ")) return <h2 key={i} className="mt-6 text-lg font-semibold text-foreground">{l.slice(2)}</h2>;
        if (l.startsWith("- ") || l.startsWith("* ")) return <li key={i} className="ml-5 list-disc text-sm">{l.slice(2)}</li>;
        if (!l.trim()) return <div key={i} className="h-2" />;
        return <p key={i} className="text-sm leading-relaxed">{l}</p>;
      })}
    </div>
  );
}