import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/scale/AppHeader";
import { SiteFooter } from "@/components/scale/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/_coach/settings")({
  head: () => ({ meta: [{ title: "Settings — SCALE Coach" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!authLoading && role !== "coach") navigate({ to: "/" });
  }, [authLoading, role, navigate]);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("ghl_webhook_url, ghl_enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUrl(data.ghl_webhook_url ?? "");
          setEnabled(data.ghl_enabled);
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: 1, ghl_webhook_url: url || null, ghl_enabled: enabled, updated_at: new Date().toISOString() } as any,
        { onConflict: "id" },
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  }

  async function handleTest() {
    if (!url) {
      toast.error("Enter a webhook URL first");
      return;
    }
    setTesting(true);
    try {
      const samplePayload = {
        test: true,
        email: "test@example.com",
        first_name: "Test",
        last_name: "Lead",
        full_name: "Test Lead",
        phone: "(555) 555-5555",
        assessment_type: "inner_capacity",
        overall_score: 78,
        overall_level: "Stable and Growing",
        primary_gap: "Energy & Recovery",
        primary_gap_score: 28,
        primary_gap_level: "Critical Gap",
        secondary_gap: "Self-Trust & Follow-Through",
        secondary_gap_score: 34,
        subcategory_scores: { "Energy & Recovery": 28, "Stability & Structure": 42 },
        pdf_url: "https://example.com/sample.pdf",
        generated_at: new Date().toISOString(),
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplePayload),
      });
      if (res.ok) toast.success("Test payload sent successfully");
      else toast.error(`GHL responded ${res.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach GHL");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader variant="coach" />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your GoHighLevel automation. Each generated gap report posts to this webhook with the
          full lead profile, scores, and a 1-hour signed PDF link.
        </p>

        {loading ? (
          <div className="mt-10 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">GoHighLevel integration</h2>

            <div className="mt-6 flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <div className="text-sm font-medium text-foreground">Enable webhook</div>
                <div className="text-xs text-muted-foreground">
                  When on, every new gap report fires this webhook.
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="ghl-url">Webhook URL</Label>
              <Input
                id="ghl-url"
                type="url"
                placeholder="https://services.leadconnectorhq.com/hooks/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                In GHL, create a workflow with a Webhook trigger and paste its URL here.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>) : "Save settings"}
              </Button>
              <Button variant="outline" onClick={handleTest} disabled={testing || !url}>
                {testing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Send test payload</>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Payload fields sent to GHL
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {[
              "email", "first_name", "last_name", "phone", "assessment_type",
              "overall_score", "overall_level", "primary_gap", "primary_gap_score",
              "primary_gap_level", "secondary_gap", "secondary_gap_score",
              "subcategory_scores", "pdf_url", "generated_at",
            ].map((f) => (
              <li key={f} className="font-mono">{f}</li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
