import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertSafeWebhookUrl } from "@/lib/webhook-url";

const InputSchema = z.object({
  accessToken: z.string().min(1),
  force: z.boolean().optional(),
});

const ASSESSMENT_LABELS: Record<string, string> = {
  inner_capacity: "Inner Capacity",
  personal_leadership: "Personal Leadership",
  business_audit: "Business Audit",
};

const RL_PURPLE = rgb(0.355, 0.176, 0.557);
const RL_DARK = rgb(0.08, 0.08, 0.12);
const RL_MUTED = rgb(0.45, 0.45, 0.5);

function wrap(text: string, font: any, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(t, size) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
const stripInline = (s: string) =>
  s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/_(.+?)_/g, "$1");

export const generateComprehensiveReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: claims, error: cErr } = await supabase.auth.getClaims(data.accessToken);
    if (cErr || !claims?.claims?.sub) throw new Error("Unauthorized");
    const userId = claims.claims.sub;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, first_name, last_name, email, phone")
      .eq("id", userId)
      .maybeSingle();

    const { data: allSessions } = await supabase
      .from("assessment_sessions")
      .select("assessment_type, overall_score, overall_level, subcategory_scores, primary_gap, primary_gap_score, primary_gap_level, secondary_gap, secondary_gap_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const latestByType: Record<string, any> = {};
    for (const s of allSessions ?? []) {
      if (!latestByType[s.assessment_type]) latestByType[s.assessment_type] = s;
    }
    const taken = Object.keys(latestByType);
    if (taken.length === 0) throw new Error("Take at least one assessment first.");
    if (taken.length < 3) {
      throw new Error("Complete all three assessments to generate your Gap Report.");
    }

    // Try cached comprehensive markdown
    const { data: existing } = await supabase
      .from("gap_reports")
      .select("report_data, pdf_path")
      .eq("user_id", userId)
      .maybeSingle();

    const existingData = (existing?.report_data ?? {}) as Record<string, any>;
    let markdown: string | null = !data.force ? existingData.comprehensive_markdown ?? null : null;
    const cachedSignature: string | null = existingData.comprehensive_signature ?? null;
    const signature = JSON.stringify(
      Object.fromEntries(
        Object.entries(latestByType).map(([k, v]) => [k, [v.overall_score, v.created_at]]),
      ),
    );
    if (markdown && cachedSignature !== signature) markdown = null;

    if (!markdown) {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
      const userPayload = {
        assessee_name: profile?.full_name || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "this leader",
        assessments: Object.entries(latestByType).map(([type, v]) => ({
          name: ASSESSMENT_LABELS[type],
          overall_score: v.overall_score,
          overall_level: v.overall_level,
          primary_gap: v.primary_gap,
          subcategories: v.subcategory_scores,
        })),
        not_taken: ["inner_capacity", "personal_leadership", "business_audit"]
          .filter((t) => !latestByType[t])
          .map((t) => ASSESSMENT_LABELS[t]),
      };

      const systemPrompt = `You are Rich Lohman, an executive leadership coach. Generate a personalized COMPREHENSIVE SCALE Gap Report combining the assessee's results across all assessments they have completed. Direct, warm, executive-grade voice. Address the assessee in second person ("you"). Use the EXACT structure below with markdown headings.

# Executive Summary
2 short paragraphs naming the strongest area and the most critical gap across all assessments. Be specific to scores.

# Inner Capacity Analysis
For EACH subcategory present, write: "**<Subcategory Name>** — <Critical Gap | Moderate Gap | Strength>: <one to two crisp sentences>". Use < 60 = Critical Gap, 60-79 = Moderate Gap, 80+ = Strength. If this assessment was not taken, write a single line: "_Not yet taken — complete this assessment for a fuller picture._"

# Personal Leadership Analysis
Same format as above.

# Business Audit Analysis
Same format as above.

# Cross-Connection Analysis
2-3 paragraphs explaining how gaps in one area cascade into the others. Be specific to the scores.

# Your Top 3 Priorities
A numbered list of three concrete focus areas based on the lowest-scoring categories.

# Your Next Step
Recommend a path. Briefly describe these three options and which fits this assessee best:
- DIY Path (self-directed)
- Leaders Edge (group program)
- 1:1 Coaching with Rich (recommended for high-impact gaps)`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(userPayload, null, 2) },
          ],
        }),
      });
      if (!resp.ok) {
        if (resp.status === 429) throw new Error("Too many requests — try again in a minute.");
        if (resp.status === 402) throw new Error("AI credits exhausted.");
        throw new Error("Could not generate comprehensive report.");
      }
      const ai = await resp.json();
      markdown = ai?.choices?.[0]?.message?.content ?? "";
      if (!markdown) throw new Error("Empty AI response.");
    }

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const body = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const PAGE_W = 612, PAGE_H = 792, M = 60, CW = PAGE_W - M * 2, FY = 30;
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - M;

    const drawFooter = (p: typeof page) => {
      const t = "RichLohman.com · rich@richlohman.com · (616) 299-9165";
      const w = body.widthOfTextAtSize(t, 9);
      p.drawText(t, { x: (PAGE_W - w) / 2, y: FY, size: 9, font: body, color: RL_MUTED });
    };
    const newPage = () => {
      drawFooter(page);
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;
    };
    const ensure = (n: number) => { if (y - n < FY + 30) newPage(); };
    const drawWrap = (t: string, f: any, sz: number, color = RL_DARK, gap = 4) => {
      for (const line of wrap(t, f, sz, CW)) {
        ensure(sz + gap);
        page.drawText(line, { x: M, y: y - sz, size: sz, font: f, color });
        y -= sz + gap;
      }
    };

    // Cover
    page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: RL_PURPLE });
    y = PAGE_H - 140;
    page.drawText("RICH LOHMAN", { x: M, y, size: 14, font: bold, color: RL_PURPLE });
    y -= 24;
    page.drawText("Executive Leadership Coaching", { x: M, y, size: 10, font: body, color: RL_MUTED });
    y -= 80;
    page.drawText("Comprehensive", { x: M, y, size: 34, font: bold, color: RL_DARK });
    y -= 36;
    page.drawText("SCALE Gap Report", { x: M, y, size: 34, font: bold, color: RL_DARK });
    y -= 28;
    page.drawText("Your full leadership diagnostic across all three assessments", { x: M, y, size: 13, font: body, color: RL_MUTED });
    y -= 60;
    const name = profile?.full_name || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
    if (name) {
      page.drawText("Prepared for", { x: M, y, size: 10, font: body, color: RL_MUTED });
      y -= 18;
      page.drawText(name, { x: M, y, size: 18, font: bold, color: RL_DARK });
      y -= 30;
    }
    page.drawText(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { x: M, y, size: 10, font: body, color: RL_MUTED });

    // Score grid
    let gx = M;
    const gy = 280, gw = (CW - 20) / 3, gh = 110;
    for (const t of ["inner_capacity", "personal_leadership", "business_audit"]) {
      const s = latestByType[t];
      page.drawRectangle({ x: gx, y: gy - gh, width: gw, height: gh, color: rgb(0.98, 0.96, 1), borderColor: RL_PURPLE, borderWidth: 1 });
      page.drawText(ASSESSMENT_LABELS[t].toUpperCase(), { x: gx + 12, y: gy - 22, size: 8, font: bold, color: RL_PURPLE });
      if (s) {
        page.drawText(String(s.overall_score), { x: gx + 12, y: gy - 70, size: 36, font: bold, color: RL_DARK });
        if (s.overall_level) page.drawText(s.overall_level, { x: gx + 12, y: gy - 92, size: 9, font: body, color: RL_MUTED });
      } else {
        page.drawText("Not yet taken", { x: gx + 12, y: gy - 60, size: 11, font: body, color: RL_MUTED });
      }
      gx += gw + 10;
    }
    drawFooter(page);

    // Body pages
    newPage();
    for (const raw of (markdown ?? "").split("\n")) {
      const line = raw.replace(/\r$/, "");
      if (/^# /.test(line)) {
        ensure(50); y -= 10;
        const t = stripInline(line.replace(/^# /, ""));
        page.drawText(t, { x: M, y: y - 20, size: 18, font: bold, color: RL_DARK });
        y -= 24;
        page.drawRectangle({ x: M, y, width: 40, height: 2, color: RL_PURPLE });
        y -= 16;
      } else if (/^## /.test(line)) {
        ensure(30); y -= 6;
        page.drawText(stripInline(line.replace(/^## /, "")), { x: M, y: y - 14, size: 13, font: bold, color: RL_DARK });
        y -= 22;
      } else if (/^[-*] /.test(line)) {
        drawWrap("• " + stripInline(line.replace(/^[-*] /, "")), body, 11, RL_DARK, 4);
        y -= 2;
      } else if (/^\d+\.\s/.test(line)) {
        drawWrap(stripInline(line), body, 11, RL_DARK, 4);
        y -= 2;
      } else if (line.trim() === "") {
        y -= 8;
      } else {
        drawWrap(stripInline(line), body, 11, RL_DARK, 4);
        y -= 4;
      }
    }
    drawFooter(page);

    const pdfBytes = await pdfDoc.save();
    const storagePath = `${userId}/comprehensive.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("reports")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error("Could not save PDF");
    const { data: pub } = supabaseAdmin.storage.from("reports").getPublicUrl(storagePath);
    const pdfUrl = pub.publicUrl;

    // Persist comprehensive markdown + scores into gap_reports
    const ic = latestByType.inner_capacity;
    const pl = latestByType.personal_leadership;
    const ba = latestByType.business_audit;
    await supabaseAdmin
      .from("gap_reports")
      .upsert(
        {
          user_id: userId,
          report_data: {
            ...existingData,
            comprehensive_markdown: markdown,
            comprehensive_signature: signature,
          } as never,
          pdf_path: storagePath,
          inner_capacity_score: ic?.overall_score ?? null,
          inner_capacity_level: ic?.overall_level ?? null,
          leadership_score: pl?.overall_score ?? null,
          business_score: ba?.overall_score ?? null,
        },
        { onConflict: "user_id" },
      );

    // GHL webhook (fire-and-forget) — only when all three assessments completed
    try {
      if (taken.length === 3) {
        const { data: settings } = await supabaseAdmin
          .from("app_settings")
          .select("ghl_enabled, ghl_webhook_url")
          .eq("id", 1)
          .maybeSingle();
        if (settings?.ghl_enabled && settings.ghl_webhook_url && profile) {
          const payload = {
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: profile.full_name,
            phone: profile.phone,
            report_type: "comprehensive",
            inner_capacity_score: ic?.overall_score,
            inner_capacity_level: ic?.overall_level,
            leadership_score: pl?.overall_score,
            leadership_level: pl?.overall_level,
            business_score: ba?.overall_score,
            business_level: ba?.overall_level,
            pdf_url: pdfUrl,
            generated_at: new Date().toISOString(),
          };
          const safeUrl = assertSafeWebhookUrl(settings.ghl_webhook_url);
          const r = await fetch(safeUrl.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (r.ok) {
            await supabaseAdmin
              .from("gap_reports")
              .update({ ghl_sent_at: new Date().toISOString() })
              .eq("user_id", userId);
          }
        }
      }
    } catch (e) {
      console.error("GHL comprehensive webhook failed", e);
    }

    return {
      markdown,
      pdfUrl,
      sessions: latestByType as Record<string, any>,
      complete: taken.length === 3,
    };
  });