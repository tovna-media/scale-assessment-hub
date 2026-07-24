import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  combinedScaleLevel,
  scoreBusiness,
  scoreInnerCapacity,
  scoreLeadership,
  type AssessmentType,
} from "@/lib/assessments";

type SessionRow = {
  id: string;
  assessment_type: AssessmentType;
  responses: Record<string, number> | null;
  subcategory_scores: Record<string, number> | null;
  gap_report: string | null;
  primary_gap: string | null;
  primary_gap_score: number | null;
  primary_gap_level: string | null;
  secondary_gap: string | null;
  secondary_gap_score: number | null;
  overall_score: number;
  overall_level: string | null;
};

function toNumberMap(raw: Record<string, number> | null | undefined): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(raw ?? {})) out[Number(key)] = Number(value);
  return out;
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function stripInline(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↔/g, "<->")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...");
}

async function createAndUploadPdf(userId: string, session: SessionRow, combinedTotal: number, combinedLevelLabel: string) {
  if (!session.gap_report) throw new Error("Gap report content not yet generated");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  const pdfDoc = await PDFDocument.create();
  const body = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 60;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const FOOTER_Y = 30;
  const RL_PURPLE = rgb(0.355, 0.176, 0.557);
  const RL_DARK = rgb(0.08, 0.08, 0.12);
  const RL_MUTED = rgb(0.45, 0.45, 0.5);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let cursorY = PAGE_H - MARGIN;

  function drawFooter(p: typeof page) {
    const footerText = "RichLohman.com · rich@richlohman.com · (616) 299-9165";
    const w = body.widthOfTextAtSize(footerText, 9);
    p.drawText(footerText, { x: (PAGE_W - w) / 2, y: FOOTER_Y, size: 9, font: body, color: RL_MUTED });
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
    for (const line of wrapText(text, font, size, CONTENT_W)) {
      ensureSpace(size + lineGap);
      page.drawText(line, { x: MARGIN, y: cursorY - size, size, font, color });
      cursorY -= size + lineGap;
    }
  }

  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: RL_PURPLE });
  cursorY = PAGE_H - 140;
  page.drawText("RICH LOHMAN", { x: MARGIN, y: cursorY, size: 14, font: bold, color: RL_PURPLE });
  cursorY -= 24;
  page.drawText("Executive Leadership Coaching", { x: MARGIN, y: cursorY, size: 10, font: body, color: RL_MUTED });
  cursorY -= 80;
  page.drawText("SCALE Gap Report", { x: MARGIN, y: cursorY, size: 34, font: bold, color: RL_DARK });
  cursorY -= 28;
  page.drawText("Your personalized leadership diagnostic", { x: MARGIN, y: cursorY, size: 14, font: body, color: RL_MUTED });
  cursorY -= 80;
  const name = profile?.full_name || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  if (name) {
    page.drawText("Prepared for", { x: MARGIN, y: cursorY, size: 10, font: body, color: RL_MUTED });
    cursorY -= 18;
    page.drawText(name, { x: MARGIN, y: cursorY, size: 18, font: bold, color: RL_DARK });
    cursorY -= 30;
  }
  page.drawText(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, {
    x: MARGIN,
    y: cursorY,
    size: 10,
    font: body,
    color: RL_MUTED,
  });
  cursorY = 260;
  page.drawRectangle({ x: MARGIN, y: cursorY - 110, width: CONTENT_W, height: 110, color: rgb(0.98, 0.96, 1), borderColor: RL_PURPLE, borderWidth: 1 });
  page.drawText("OVERALL SCALE SCORE", { x: MARGIN + 24, y: cursorY - 32, size: 10, font: bold, color: RL_PURPLE });
  page.drawText(String(combinedTotal), { x: MARGIN + 24, y: cursorY - 82, size: 44, font: bold, color: RL_DARK });
  page.drawText(`${combinedLevelLabel} · out of 445`, { x: MARGIN + 24, y: cursorY - 100, size: 11, font: body, color: RL_MUTED });
  drawFooter(page);

  newPage();
  for (const raw of session.gap_report.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (/^# /.test(line)) {
      ensureSpace(50);
      cursorY -= 10;
      page.drawText(stripInline(line.replace(/^# /, "")), { x: MARGIN, y: cursorY - 20, size: 18, font: bold, color: RL_DARK });
      cursorY -= 24;
      page.drawRectangle({ x: MARGIN, y: cursorY, width: 40, height: 2, color: RL_PURPLE });
      cursorY -= 16;
    } else if (/^## /.test(line)) {
      ensureSpace(30);
      cursorY -= 6;
      page.drawText(stripInline(line.replace(/^## /, "")), { x: MARGIN, y: cursorY - 14, size: 13, font: bold, color: RL_DARK });
      cursorY -= 22;
    } else if (/^[-*] /.test(line)) {
      drawWrapped("• " + stripInline(line.replace(/^[-*] /, "")), body, 11, RL_DARK, 4);
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
  const storagePath = `${userId}/${session.id}.pdf`;
  const { error: uploadErr } = await supabaseAdmin.storage.from("reports").upload(storagePath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadErr) throw new Error(`Could not save PDF to storage: ${uploadErr.message}`);

  const { data: publicUrlData } = supabaseAdmin.storage.from("reports").getPublicUrl(storagePath);
  if (!publicUrlData.publicUrl) throw new Error("Could not create report URL");
  return { pdfPath: storagePath, reportUrl: publicUrlData.publicUrl };
}

export async function generateGapReportPdfAndNotify(userId: string, sessionId: string) {
  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("assessment_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!sessionData) throw new Error("Session not found");

  const session = sessionData as unknown as SessionRow;
  const { data: allSessions } = await supabaseAdmin
    .from("assessment_sessions")
    .select("assessment_type, responses, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const latestResp: Partial<Record<AssessmentType, Record<number, number>>> = {};
  for (const row of allSessions ?? []) {
    const type = row.assessment_type as AssessmentType;
    if (!latestResp[type]) latestResp[type] = toNumberMap(row.responses as Record<string, number> | null);
  }
  latestResp[session.assessment_type] = toNumberMap(session.responses);

  const innerCapacity = scoreInnerCapacity(latestResp.inner_capacity ?? {});
  const leadership = scoreLeadership(latestResp.personal_leadership ?? {});
  const business = scoreBusiness(latestResp.business_audit ?? {});
  const combinedTotal = innerCapacity.total + leadership.total + business.total;
  const combinedLevel = combinedScaleLevel(combinedTotal);
  const { pdfPath, reportUrl } = await createAndUploadPdf(userId, session, combinedTotal, combinedLevel);

  const completedAt = new Date().toISOString();
  await supabaseAdmin.from("gap_reports").upsert(
    {
      user_id: userId,
      report_data: {
        session_id: session.id,
        assessment_type: session.assessment_type,
        subcategory_scores: session.subcategory_scores,
        report_url: reportUrl,
      } as never,
      pdf_path: pdfPath,
      primary_gap: innerCapacity.primary?.name ?? session.primary_gap,
      primary_gap_level: innerCapacity.primary?.level ?? session.primary_gap_level,
      inner_capacity_score: innerCapacity.total,
      inner_capacity_level: innerCapacity.level,
      leadership_score: leadership.total,
      business_score: business.total,
      generated_at: completedAt,
    },
    { onConflict: "user_id" },
  );

  // The app sends the "your report is ready" email itself via the
  // transactional email pipeline — no external GHL webhook needed.
  return { reportUrl, pdfUrl: reportUrl, pdfPath, webhookSent: false };
}