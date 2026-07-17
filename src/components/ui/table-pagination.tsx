import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;

export function usePagination<T>(items: T[], defaultSize = 10) {
  const [pageSize, setPageSize] = useState<number>(defaultSize);
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Clamp page when data/pageSize changes.
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageSize, setPageSize, pageCount, total, paged };
}

interface Props {
  page: number;
  setPage: (n: number) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  pageCount: number;
  total: number;
  label?: string;
  className?: string;
}

export function TablePagination({
  page, setPage, pageSize, setPageSize, pageCount, total, label = "items", className,
}: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={"flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground " + (className ?? "")}>
      <div>
        Showing <span className="font-medium text-[color:var(--fr-ink)]">{from}–{to}</span> of{" "}
        <span className="font-medium text-[color:var(--fr-ink)]">{total}</span> {label}
      </div>
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-2 flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums px-1">Page {page} / {pageCount}</span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}