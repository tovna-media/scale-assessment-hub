// Utilities for rendering a printable view of Optimizer Guide sections.

export const SECTION_TITLES: Record<number, string> = {
  1: "Begin Your Leadership Optimization Cycle",
  2: "Lead Yourself",
  3: "Leadership Performance Dashboard",
  4: "Lead Others",
  5: "Growing People Intentionally",
  6: "Leadership Review & Recalibration",
  7: "Lead for Results",
  8: "Evaluation & Crucial Conversations",
  9: "Integration & Real-World Leadership",
  10: "Lead Leaders",
  11: "Protecting the Leadership System",
  12: "Leadership Optimization Review",
};

const ACRONYMS = new Set(["fuel", "disc", "rl", "gap", "kpi", "kpis"]);

export function humanizeKey(key: string): string {
  // Strip common prefixes: p1_, part2_, step3_, s4_, q5_
  let k = key.replace(/^(p|part|step|s|q)\d+_/i, "");
  k = k.replace(/_/g, " ").trim();
  if (!k) return key;
  return k
    .split(" ")
    .filter(Boolean)
    .map((w) =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

export function groupByPart(
  data: Record<string, unknown>,
): { part: string; entries: [string, unknown][] }[] {
  const groups = new Map<string, [string, unknown][]>();
  for (const [key, value] of Object.entries(data)) {
    if (key === "step" || key === "part") continue;
    const m = key.match(/^(p|part|step|s)(\d+)_/i);
    const partKey = m ? `Part ${m[2]}` : "Details";
    if (!groups.has(partKey)) groups.set(partKey, []);
    groups.get(partKey)!.push([key, value]);
  }
  // Preserve Part order numerically, then Details last
  return Array.from(groups.entries())
    .sort((a, b) => {
      if (a[0] === "Details") return 1;
      if (b[0] === "Details") return -1;
      const ai = parseInt(a[0].replace(/\D+/g, ""), 10) || 0;
      const bi = parseInt(b[0].replace(/\D+/g, ""), 10) || 0;
      return ai - bi;
    })
    .map(([part, entries]) => ({ part, entries }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

export function looksLikeActionItem(v: unknown): v is { text?: string; due?: string; done?: boolean } {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    ("text" in (v as Record<string, unknown>) ||
      "task" in (v as Record<string, unknown>) ||
      "action" in (v as Record<string, unknown>));
}

export function looksLikeMarker(v: unknown): v is { label?: string; value?: string | number; target?: string | number; date?: string } {
  return !!v && typeof v === "object" && !Array.isArray(v) &&
    ("label" in (v as Record<string, unknown>) &&
      ("value" in (v as Record<string, unknown>) || "target" in (v as Record<string, unknown>)));
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}