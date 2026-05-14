import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  sessionId: z.string().uuid(),
  accessToken: z.string().min(1),
});

// Rich Lohman brand purple
const RL_PURPLE = rgb(0.355, 0.176, 0.557); // ~ #5B2D8E
const RL_DARK = rgb(0.08, 0.08, 0.12);
const RL_MUTED = rgb(0.45, 0.45, 0.5);
const RL_BORDER = rgb(0.88, 0.88, 0.92);

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    const w = font.widthOfTextAtSize(test, fontSize);
    if (w > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Strip simple inline markdown (**bold**, _em_) for plain PDF text
function stripInline(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/_(.+?)_/g, "$1");
}

export const generatePdfReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(data.accessToken);
    if (claimsErr || !claims?.claims?.sub) throw new Error("Unauthorized");
    const userId = claims.claims.sub;

    const { data: session, error: sErr } = await supabase
      .from("assessment_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Session not found");
    if (!session.gap_report) throw new Error("Gap report content not yet generated");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, first_name, last_name, email, phone")
      .eq("id", userId)
      .maybeSingle();

    // Build the PDF
    const pdfDoc = await PDFDocument.create();
    const body = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 612; // US letter
    const PAGE_H = 792;
    const MARGIN = 60;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const FOOTER_Y = 30;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let cursorY = PAGE_H - MARGIN;

    function drawFooter(p: typeof page) {
      const footerText = "RichLohman.com · rich@richlohman.com · (616) 299-9165";
      const w = body.widthOfTextAtSize(footerText, 9);
      p.drawText(footerText, {
        x: (PAGE_W - w) / 2,
        y: FOOTER_Y,
        size: 9,
        font: body,
        color: RL_MUTED,
      });
    }

    function newPage() {
      drawFooter(page);
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      cursorY = PAGE_H - MARGIN;
    }

    function ensureSpace(needed: number) {
      if (cursorY - needed < FOOTER_Y + 30) newPage();
    }

    function drawWrapped(text: string, font: any, size: number, color = RL_DARK, lineGap = 4) {
      const lines = wrapText(text, font, size, CONTENT_W);
      for (const line of lines) {
        ensureSpace(size + lineGap);
        page.drawText(line, { x: MARGIN, y: cursorY - size, size, font, color });
        cursorY -= size + lineGap;
      }
    }

    // ===== Cover =====
    // Purple accent bar
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 8,
      width: PAGE_W,
      height: 8,
      color: RL_PURPLE,
    });

    cursorY = PAGE_H - 140;
    page.drawText("RICH LOHMAN", {
      x: MARGIN,
      y: cursorY,
      size: 14,
      font: bold,
      color: RL_PURPLE,
    });
    cursorY -= 24;
    page.drawText("Executive Leadership Coaching", {
      x: MARGIN,
      y: cursorY,
      size: 10,
      font: body,
      color: RL_MUTED,
    });

    cursorY -= 80;
    page.drawText("SCALE Gap Report", {
      x: MARGIN,
      y: cursorY,
      size: 34,
      font: bold,
      color: RL_DARK,
    });
    cursorY -= 28;
    page.drawText("Your personalized leadership diagnostic", {
      x: MARGIN,
      y: cursorY,
      size: 14,
      font: body,
      color: RL_MUTED,
    });

    cursorY -= 80;
    if (profile?.full_name || profile?.first_name) {
      const name = profile.full_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
      page.drawText("Prepared for", {
        x: MARGIN,
        y: cursorY,
        size: 10,
        font: body,
        color: RL_MUTED,
      });
      cursorY -= 18;
      page.drawText(name, { x: MARGIN, y: cursorY, size: 18, font: bold, color: RL_DARK });
      cursorY -= 30;
    }
    page.drawText(`Generated ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`, {
      x: MARGIN,
      y: cursorY,
      size: 10,
      font: body,
      color: RL_MUTED,
    });

    // Overall score box
    cursorY = 260;
    page.drawRectangle({
      x: MARGIN,
      y: cursorY - 110,
      width: CONTENT_W,
      height: 110,
      color: rgb(0.98, 0.96, 1),
      borderColor: RL_PURPLE,
      borderWidth: 1,
    });
    page.drawText("OVERALL SCALE SCORE", {
      x: MARGIN + 24,
      y: cursorY - 32,
      size: 10,
      font: bold,
      color: RL_PURPLE,
    });
    page.drawText(String(session.overall_score), {
      x: MARGIN + 24,
      y: cursorY - 82,
      size: 44,
      font: bold,
      color: RL_DARK,
    });
    if (session.overall_level) {
      page.drawText(session.overall_level, {
        x: MARGIN + 24,
        y: cursorY - 100,
        size: 11,
        font: body,
        color: RL_MUTED,
      });
    }

    drawFooter(page);

    // ===== Report body pages =====
    newPage();

    const reportText = session.gap_report ?? "";
    const lines = reportText.split("\n");

    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      if (/^# /.test(line)) {
        ensureSpace(50);
        cursorY -= 10;
        const t = stripInline(line.replace(/^# /, ""));
        // Purple underline label
        page.drawText(t, { x: MARGIN, y: cursorY - 20, size: 18, font: bold, color: RL_DARK });
        cursorY -= 24;
        page.drawRectangle({
          x: MARGIN,
          y: cursorY,
          width: 40,
          height: 2,
          color: RL_PURPLE,
        });
        cursorY -= 16;
      } else if (/^## /.test(line)) {
        ensureSpace(30);
        cursorY -= 6;
        const t = stripInline(line.replace(/^## /, ""));
        page.drawText(t, { x: MARGIN, y: cursorY - 14, size: 13, font: bold, color: RL_DARK });
        cursorY -= 22;
      } else if (/^[-*] /.test(line)) {
        const t = "• " + stripInline(line.replace(/^[-*] /, ""));
        drawWrapped(t, body, 11, RL_DARK, 4);
        cursorY -= 2;
      } else if (line.trim() === "") {
        cursorY -= 8;
      } else {
        drawWrapped(stripInline(line), body, 11, RL_DARK, 4);
        cursorY -= 4;
      }
    }

    drawFooter(page);

    const pdfBytes = await pdfDoc.save();

    // Upload to storage (use admin to bypass any RLS quirks)
    const storagePath = `${userId}/${session.id}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("reports")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) {
      console.error("PDF upload failed", uploadErr);
      throw new Error("Could not save PDF to storage");
    }

    // The `reports` bucket is public — return a permanent URL that
    // works for prospects clicking from email or GHL follow-ups.
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("reports")
      .getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;
    if (!publicUrl) throw new Error("Could not create download link");

    // Upsert gap_reports record + fire GHL webhook
    await supabaseAdmin
      .from("gap_reports")
      .upsert(
        {
          user_id: userId,
          report_data: {
            session_id: session.id,
            assessment_type: session.assessment_type,
            subcategory_scores: session.subcategory_scores,
          } as never,
          pdf_path: storagePath,
          primary_gap: session.primary_gap,
          primary_gap_level: session.primary_gap_level,
        },
        { onConflict: "user_id" },
      );

    // GHL webhook (fire-and-forget; errors logged but don't block)
    try {
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
          assessment_type: session.assessment_type,
          overall_score: session.overall_score,
          overall_level: session.overall_level,
          primary_gap: session.primary_gap,
          primary_gap_score: session.primary_gap_score,
          primary_gap_level: session.primary_gap_level,
          secondary_gap: session.secondary_gap,
          secondary_gap_score: session.secondary_gap_score,
          subcategory_scores: session.subcategory_scores,
          pdf_url: publicUrl,
          generated_at: new Date().toISOString(),
        };
        const res = await fetch(settings.ghl_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          await supabaseAdmin
            .from("gap_reports")
            .update({ ghl_sent_at: new Date().toISOString() })
            .eq("user_id", userId);
        } else {
          console.error("GHL webhook non-OK", res.status);
        }
      }
    } catch (e) {
      console.error("GHL webhook failed", e);
    }

    return { pdfUrl: publicUrl, pdfPath: storagePath };
  });
