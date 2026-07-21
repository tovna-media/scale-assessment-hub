import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { getSubscriptionStatus } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { PrintHeader, PrintFooter, SectionPrint } from "@/components/scale/PrintDoc";

export const Route = createFileRoute("/_authenticated/print/all")({
  head: () => ({ meta: [{ title: "Print all sections — Fully Resourced" }] }),
  component: PrintAllPage,
});

interface Row {
  section_number: number;
  data: Record<string, unknown> | null;
  completed: boolean;
}

function PrintAllPage() {
  const { user } = useAuth();
  const checkSub = useServerFn(getSubscriptionStatus);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState<string>("");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [sub, prof, res] = await Promise.all([
        checkSub({}).then((s) => Boolean(s.active)).catch(() => false),
        supabase.from("profiles").select("first_name,last_name,full_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("optimizer_section_progress")
          .select("section_number, data, completed")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("section_number", { ascending: true }),
      ]);
      setSubscribed(sub);
      const p = prof.data as { first_name?: string | null; last_name?: string | null; full_name?: string | null } | null;
      const composed = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
      setName(composed || p?.full_name || user.email || "Member");
      setRows(((res.data ?? []) as unknown) as Row[]);
      setLoading(false);
    })();
  }, [user, checkSub]);

  if (loading) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading…</main>;
  }
  if (subscribed === false) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-muted-foreground">An active Fully Resourced subscription is required to print sections.</p>
        <SubscribeBtn />
      </main>
    );
  }

  return (
    <>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/90 px-4 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cycle"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to My Cycle</Link>
        </Button>
        <p className="text-xs text-muted-foreground">All completed sections ({rows.length})</p>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>
      <main className="print-doc mx-auto max-w-3xl bg-white px-8 py-10 text-black">
        <PrintHeader memberName={name} memberEmail={user?.email} />
        {rows.length === 0 ? (
          <p className="text-sm italic text-neutral-500">No completed sections yet.</p>
        ) : (
          rows.map((r) => (
            <SectionPrint
              key={r.section_number}
              sectionNumber={r.section_number}
              data={(r.data?.data as Record<string, unknown>) ?? (r.data as Record<string, unknown>) ?? null}
            />
          ))
        )}
        <PrintFooter />
      </main>
    </>
  );
}