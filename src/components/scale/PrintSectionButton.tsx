import { Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintSectionButton({
  section,
  hasContent,
}: {
  section: number;
  hasContent: boolean;
}) {
  if (!hasContent) return null;
  return (
    <Button asChild variant="outline" size="sm" className="no-print">
      <Link
        to="/print/section/$number"
        params={{ number: String(section) }}
        target="_blank"
        rel="noopener"
      >
        <Printer className="mr-1.5 h-3.5 w-3.5" />
        Print / Save as PDF
      </Link>
    </Button>
  );
}