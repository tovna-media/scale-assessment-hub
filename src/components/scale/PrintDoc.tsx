import type { ReactNode } from "react";
import logoAsset from "@/assets/fr-logo.png.asset.json";
import {
  SECTION_TITLES,
  groupByPart,
  humanizeKey,
  isEmptyValue,
  looksLikeActionItem,
  looksLikeMarker,
  formatDate,
} from "@/lib/section-print";

const PURPLE = "#5B2D8E";

export function PrintHeader({ memberName, memberEmail }: { memberName: string; memberEmail?: string | null }) {
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return (
    <header className="mb-8 flex items-start justify-between border-b pb-4" style={{ borderColor: PURPLE }}>
      <div className="flex items-center gap-3">
        <img src={logoAsset.url} alt="Rich Lohman" className="h-12 w-12 rounded-lg" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: PURPLE }}>
            Fully Resourced · Optimized Leader Guide
          </p>
          <p className="text-sm font-medium text-black">{memberName || "Member"}</p>
          {memberEmail && <p className="text-xs text-neutral-600">{memberEmail}</p>}
        </div>
      </div>
      <div className="text-right text-xs text-neutral-700">
        <p>Printed {today}</p>
      </div>
    </header>
  );
}

export function PrintFooter() {
  return (
    <div className="print-footer">
      Powered by the Fully Resourced Leadership System®
    </div>
  );
}

export function SectionPrint({
  sectionNumber,
  data,
}: {
  sectionNumber: number;
  data: Record<string, unknown> | null | undefined;
}) {
  const title = SECTION_TITLES[sectionNumber] || `Section ${sectionNumber}`;
  const groups = data ? groupByPart(data) : [];

  return (
    <section className="print-section mb-10">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: PURPLE }}>
          Section {sectionNumber} · Week {sectionNumber}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-black">{title}</h1>
      </div>
      {groups.length === 0 && (
        <p className="text-sm italic text-neutral-500">No entries recorded for this section.</p>
      )}
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.part} className="print-avoid">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: PURPLE }}>
              {g.part}
            </h2>
            <div className="space-y-3 border-l-2 pl-4" style={{ borderColor: `${PURPLE}33` }}>
              {g.entries.map(([k, v]) => (
                <FieldRow key={k} label={humanizeKey(k)} value={v} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="print-avoid">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{label}</p>
      <div className="mt-1 text-sm text-black">{renderValue(value)}</div>
    </div>
  );
}

function renderValue(v: unknown): ReactNode {
  if (isEmptyValue(v)) {
    return <span className="inline-block min-h-[1em] w-full border-b border-dotted border-neutral-300 text-neutral-400">—</span>;
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    // ISO date heuristic
    if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return formatDate(v);
    return <span className="whitespace-pre-wrap">{v}</span>;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return renderValue(null);
    // Array of scalars
    if (v.every((x) => typeof x === "string" || typeof x === "number" || typeof x === "boolean")) {
      return (
        <ul className="list-disc pl-5">
          {v.map((x, i) => (
            <li key={i}>{String(x)}</li>
          ))}
        </ul>
      );
    }
    // Array of action items
    if (v.every(looksLikeActionItem)) {
      return (
        <ul className="space-y-1">
          {v.map((item, i) => {
            const it = item as { text?: string; task?: string; action?: string; due?: string; done?: boolean };
            const text = it.text || it.task || it.action || "";
            if (!text && !it.due) return null;
            return (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 inline-block h-3 w-3 shrink-0 border border-black" style={{ background: it.done ? "#000" : "transparent" }} />
                <span className="flex-1">
                  <span className={it.done ? "line-through" : ""}>{text || "—"}</span>
                  {it.due && <span className="ml-2 text-neutral-600">· due {formatDate(it.due)}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }
    // Array of markers or generic objects
    if (v.every(looksLikeMarker)) {
      return (
        <ul className="space-y-1">
          {v.map((m, i) => {
            const it = m as { label?: string; value?: string | number; target?: string | number; date?: string };
            return (
              <li key={i} className="text-sm">
                <span className="font-medium">{it.label || `Marker ${i + 1}`}</span>
                {it.value !== undefined && <span> · {String(it.value)}</span>}
                {it.target !== undefined && <span className="text-neutral-600"> (target {String(it.target)})</span>}
                {it.date && <span className="text-neutral-600"> · {formatDate(it.date)}</span>}
              </li>
            );
          })}
        </ul>
      );
    }
    return (
      <ul className="space-y-2">
        {v.map((x, i) => (
          <li key={i} className="rounded border border-neutral-200 p-2">{renderValue(x)}</li>
        ))}
      </ul>
    );
  }
  if (typeof v === "object" && v !== null) {
    const entries = Object.entries(v as Record<string, unknown>).filter(([, val]) => !isEmptyValue(val));
    if (entries.length === 0) return renderValue(null);
    return (
      <div className="space-y-1">
        {entries.map(([k, val]) => (
          <div key={k} className="text-sm">
            <span className="font-medium">{humanizeKey(k)}:</span> <span>{typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(v);
}