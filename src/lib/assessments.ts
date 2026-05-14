export type AssessmentType = "inner_capacity" | "personal_leadership" | "business_audit";

export interface Subcategory {
  name: string;
  abbr?: string;
  questionIndices: number[];
}

export interface AssessmentDef {
  type: AssessmentType;
  title: string;
  shortTitle: string;
  tagline: string;
  questions: string[];
  subcategories: Subcategory[];
}

/* ─── INNER CAPACITY ─────────────────────────────────────────── */
const innerCapacity: AssessmentDef = {
  type: "inner_capacity",
  title: "Inner Capacity Assessment",
  shortTitle: "Inner Capacity",
  tagline: "Can you handle the weight of leadership?",
  questions: [
    // Energy & Recovery (0-9)
    "I wake up feeling rested and ready for the day.",
    "My energy levels remain consistent throughout the day.",
    "I prioritize sleep as a non-negotiable part of my routine.",
    "I incorporate intentional recovery practices into my week.",
    "I recognize and respond to signs of burnout before they escalate.",
    "My physical health habits (nutrition, movement) support my output.",
    "I protect time for mental and emotional recharge.",
    "I rarely feel depleted or running on empty.",
    "My recovery rhythm is predictable and sustainable.",
    "I feel physically capable of meeting the demands of my role.",
    // Stability & Structure (10-19)
    "I have a consistent daily routine that anchors my performance.",
    "My week is structured in a way that matches my priorities.",
    "I plan ahead rather than react to what comes up.",
    "I have clear boundaries that protect my time and energy.",
    "My systems and workflows reduce chaos rather than add to it.",
    "I rarely feel out of control of my schedule.",
    "I follow through on routines even when things get busy.",
    "My environment is set up to support focused work.",
    "I have a weekly rhythm I trust and operate within.",
    "Structure is one of my strengths as a leader and performer.",
    // Support & Connection (20-29)
    "I have people in my life who genuinely support my growth.",
    "I am honest and vulnerable with at least one trusted person.",
    "I do not carry my challenges alone.",
    "My relationships energize me rather than drain me.",
    "I actively invest in relationships that matter.",
    "I ask for help when I need it.",
    "I feel connected to something bigger than myself.",
    "My support network shows up for me when I need it.",
    "I share what I'm really going through, not just the surface.",
    "I am not isolated in my role or responsibilities.",
    // Self-Trust & Follow-Through (30-39)
    "I trust my own judgment and decisions.",
    "When I commit to something, I follow through.",
    "I am consistent — people can count on me.",
    "I do not let self-doubt stop me from taking action.",
    "My inner critic does not run the show.",
    "I keep promises to myself, not just to others.",
    "I can depend on my own word.",
    "I complete what I start.",
    "My track record with myself is solid.",
    "I believe in my ability to figure things out.",
    // Purpose & Direction (40-49)
    "I have a clear sense of what I am working toward.",
    "My daily actions feel connected to a larger purpose.",
    "I know why I do what I do.",
    "I am energized by the direction my life and work are heading.",
    "I make decisions from clarity, not confusion.",
    "My goals are defined and meaningful to me.",
    "I feel a strong pull toward what's next, not away from what's now.",
    "I can articulate my vision for the future.",
    "I feel motivated by something bigger than daily tasks.",
    "My purpose gives me resilience when things get hard.",
  ],
  subcategories: [
    { name: "Energy & Recovery", abbr: "E&R", questionIndices: range(0, 9) },
    { name: "Stability & Structure", abbr: "S&S", questionIndices: range(10, 19) },
    { name: "Support & Connection", abbr: "S&C", questionIndices: range(20, 29) },
    { name: "Self-Trust & Follow-Through", abbr: "ST&FT", questionIndices: range(30, 39) },
    { name: "Purpose & Direction", abbr: "P&D", questionIndices: range(40, 49) },
  ],
};

/* ─── LEADERSHIP ─────────────────────────────────────────────── */
const leadership: AssessmentDef = {
  type: "personal_leadership",
  title: "Personal Leadership Assessment",
  shortTitle: "Personal Leadership",
  tagline: "Can you lead with clarity and consistency?",
  questions: [
    // Vision & Strategic Thinking (0-2)
    "I have a clear long-term vision for myself and my team.",
    "I consistently align daily actions with strategic goals.",
    "I regularly communicate vision to inspire others.",
    // Influence & Inspiration (3-5)
    "People seek my input and trust my judgment.",
    "I lead through influence rather than authority.",
    "My presence and energy motivate those around me.",
    // Emotional Intelligence (6-7)
    "I manage my emotions well, even under pressure.",
    "I am empathetic and aware of others' perspectives.",
    // Communication (8-10)
    "I communicate clearly and intentionally across contexts.",
    "I listen actively and ask thoughtful questions.",
    "Feedback is a regular part of my leadership approach.",
    // Decision-Making (11-12)
    "I make timely decisions with clarity and confidence.",
    "I balance data with intuition in my process.",
    // Accountability (13-14)
    "I take ownership for results, good or bad.",
    "I set a strong example of follow-through for others.",
    // Personal Discipline (15-16)
    "I have consistent habits that support my leadership role.",
    "I manage my time and energy with intentionality.",
    // People Development (17-18)
    "I actively coach and mentor my team.",
    "I create growth opportunities for others.",
    // Conflict & Tough Conversations (19-20)
    "I address issues directly and respectfully.",
    "I do not avoid conflict when it's necessary for growth.",
    // Resilience (21-22)
    "I bounce back quickly from setbacks.",
    "Challenges fuel my growth mindset.",
    // Integrity & Trust (23-24)
    "My actions align with my values.",
    "People know they can count on me.",
    // Culture Building (25-26)
    "I shape the environment with intentional values and norms.",
    "I create psychological safety and belonging on my team.",
  ],
  subcategories: [
    { name: "Vision & Strategic Thinking", questionIndices: [0, 1, 2] },
    { name: "Influence & Inspiration", questionIndices: [3, 4, 5] },
    { name: "Emotional Intelligence", questionIndices: [6, 7] },
    { name: "Communication", questionIndices: [8, 9, 10] },
    { name: "Decision-Making", questionIndices: [11, 12] },
    { name: "Accountability", questionIndices: [13, 14] },
    { name: "Personal Discipline", questionIndices: [15, 16] },
    { name: "People Development", questionIndices: [17, 18] },
    { name: "Conflict & Tough Conversations", questionIndices: [19, 20] },
    { name: "Resilience", questionIndices: [21, 22] },
    { name: "Integrity & Trust", questionIndices: [23, 24] },
    { name: "Culture Building", questionIndices: [25, 26] },
  ],
};

/* ─── BUSINESS AUDIT ─────────────────────────────────────────── */
const businessAudit: AssessmentDef = {
  type: "business_audit",
  title: "Business Audit",
  shortTitle: "Business Audit",
  tagline: "Can your business grow without depending on you?",
  questions: [
    "I invest in the growth and development of my team through regular coaching and meaningful feedback.",
    "I follow through on my commitments consistently.",
    "I have a clear business strategy that guides decisions and priorities.",
    "I model the leadership behaviors I expect from others.",
    "Communication in my business is clear, consistent, and aligned.",
    "My marketing is clear, targeted, and consistently generating leads.",
    "My sales process is structured, reliable, and producing results.",
    "My business operations run efficiently without constant intervention.",
    "I have a clear picture of my finances and manage them proactively.",
    "My team is aligned, engaged, and performing at a high level.",
    "My customers consistently receive an exceptional experience.",
    "I invest in my own development as a leader and business owner.",
  ],
  subcategories: [
    { name: "Coaching & Development", questionIndices: [0] },
    { name: "Commitment", questionIndices: [1] },
    { name: "Strategy", questionIndices: [2] },
    { name: "Leadership", questionIndices: [3] },
    { name: "Communication", questionIndices: [4] },
    { name: "Marketing", questionIndices: [5] },
    { name: "Sales", questionIndices: [6] },
    { name: "Operations", questionIndices: [7] },
    { name: "Financial Health", questionIndices: [8] },
    { name: "Team & Culture", questionIndices: [9] },
    { name: "Customer Experience", questionIndices: [10] },
    { name: "Personal Growth", questionIndices: [11] },
  ],
};

export const ASSESSMENTS: Record<AssessmentType, AssessmentDef> = {
  inner_capacity: innerCapacity,
  personal_leadership: leadership,
  business_audit: businessAudit,
};

export const ASSESSMENT_LIST: AssessmentDef[] = [innerCapacity, leadership, businessAudit];

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

/* ─── SCORING ────────────────────────────────────────────────── */

export type GapLevel = "Critical Gap" | "Moderate Gap" | "Developing" | "Strength";

export interface ScoredCategory {
  name: string;
  abbr?: string;
  score: number; // sum of raw answers in category
  max: number;   // max possible (5 * question count)
  level: GapLevel;
}

export interface InnerCapacityResult {
  total: number; // 50-250
  level: "Capacity Lagging" | "Emerging Capacity" | "Stable and Growing" | "Strong Internal Capacity";
  categories: ScoredCategory[];
  primary: ScoredCategory;
  secondary: ScoredCategory | null;
}

export interface LeadershipResult {
  total: number; // 27-135
  flagged: { questionIndex: number; category: string; reportLabel: string; descriptor: string }[];
  themeGroups: { theme: string; descriptors: string[] }[];
  strengthCategories: string[]; // category names with no flagged questions
  categoryScores: ScoredCategory[];
}

export interface BusinessResult {
  total: number; // 12-60
  categories: ScoredCategory[];
  critical: ScoredCategory[];
  moderate: ScoredCategory[];
  developing: ScoredCategory[];
  strengths: ScoredCategory[];
}

/* Inner Capacity classification (raw sum 10-50 per category) */
function classifyIC(score: number): GapLevel {
  if (score <= 32) return "Critical Gap";
  if (score <= 39) return "Moderate Gap";
  return "Strength";
}

function classifyICOverall(total: number): InnerCapacityResult["level"] {
  if (total <= 124) return "Capacity Lagging";
  if (total <= 179) return "Emerging Capacity";
  if (total <= 219) return "Stable and Growing";
  return "Strong Internal Capacity";
}

/* Business classification (single question 1-5) */
function classifyBiz(score: number): GapLevel {
  if (score <= 2) return "Critical Gap";
  if (score === 3) return "Moderate Gap";
  if (score === 4) return "Developing";
  return "Strength";
}

export function scoreInnerCapacity(responses: Record<number, number>): InnerCapacityResult {
  const cats: ScoredCategory[] = innerCapacity.subcategories.map((sub) => {
    const score = sub.questionIndices.reduce((s, i) => s + (responses[i] ?? 0), 0);
    return {
      name: sub.name,
      abbr: sub.abbr,
      score,
      max: sub.questionIndices.length * 5,
      level: classifyIC(score),
    };
  });
  const total = cats.reduce((s, c) => s + c.score, 0);

  // Primary gap = lowest score. If tied, first in declared order wins.
  const sortedAsc = [...cats].sort((a, b) => a.score - b.score);
  const lowest = sortedAsc[0].score;
  const tied = cats.filter((c) => c.score === lowest);
  const primary = tied[0]; // first in declared order (cats preserves declaration order)
  const secondary = tied.length > 1 ? tied[1] : null;

  return {
    total,
    level: classifyICOverall(total),
    categories: cats,
    primary,
    secondary,
  };
}

/* Leadership flagging map: question text → report label & descriptor */
const LEADERSHIP_FLAG_MAP: Record<number, { label: string; descriptor: string; theme: string }> = {
  0: { label: "Vision clarity", descriptor: "Long-term vision not consistently clear", theme: "Strategic Alignment" },
  1: { label: "Strategic alignment", descriptor: "Not all actions consistently tied to priorities", theme: "Strategic Alignment" },
  2: { label: "Vision communication", descriptor: "Vision not always driving daily decisions", theme: "Strategic Alignment" },
  3: { label: "Influence and credibility", descriptor: "Influence and trust still being earned", theme: "Influence and Inspiration" },
  4: { label: "Influence over authority", descriptor: "Leading through authority more than influence", theme: "Influence and Inspiration" },
  5: { label: "Leadership presence", descriptor: "Leadership presence fluctuates", theme: "Influence and Inspiration" },
  6: { label: "Emotional regulation", descriptor: "Emotional management inconsistent under pressure", theme: "Emotional Regulation" },
  7: { label: "Empathy and awareness", descriptor: "Empathy and awareness not always present", theme: "Emotional Regulation" },
  8: { label: "Communication clarity", descriptor: "Generally effective but not always intentional across contexts", theme: "Communication Consistency" },
  9: { label: "Active listening", descriptor: "Listening can drop under pressure", theme: "Communication Consistency" },
  10: { label: "Feedback consistency", descriptor: "Feedback not always consistent under pressure", theme: "Communication Consistency" },
  11: { label: "Decision confidence", descriptor: "Decisions not always made with full confidence", theme: "Decision Clarity" },
  12: { label: "Balancing data with intuition", descriptor: "Balancing data with intuition is a work in progress", theme: "Decision Clarity" },
  13: { label: "Ownership and accountability", descriptor: "Leadership behaviors present but not always consistent", theme: "Execution Consistency" },
  14: { label: "Follow-through consistency", descriptor: "Follow-through depends on circumstances", theme: "Execution Consistency" },
  15: { label: "Leadership habits", descriptor: "Leadership habits not yet fully consistent", theme: "Execution Consistency" },
  16: { label: "Time and energy management", descriptor: "Time and energy not always managed with intention", theme: "Execution Consistency" },
  17: { label: "Coaching and mentoring", descriptor: "Coaching and mentoring not always prioritized", theme: "People Development" },
  18: { label: "People development", descriptor: "Growth opportunities for the team not always prioritized", theme: "People Development" },
  19: { label: "Direct communication", descriptor: "Difficult conversations not always addressed directly", theme: "Conflict and Tough Conversations" },
  20: { label: "Conflict courage", descriptor: "Conflict avoided when growth requires it", theme: "Conflict and Tough Conversations" },
  21: { label: "Resilience under pressure", descriptor: "Recovery from setbacks not always quick", theme: "Resilience Under Pressure" },
  22: { label: "Growth mindset", descriptor: "Performance affected by difficult periods", theme: "Resilience Under Pressure" },
  23: { label: "Integrity alignment", descriptor: "Actions and values not always fully aligned", theme: "Integrity and Trust" },
  24: { label: "Dependability", descriptor: "Dependability not yet rock-solid", theme: "Integrity and Trust" },
  25: { label: "Culture intentionality", descriptor: "Team environment not always intentionally shaped", theme: "Culture Building" },
  26: { label: "Psychological safety", descriptor: "Psychological safety still being built", theme: "Culture Building" },
};

export function scoreLeadership(responses: Record<number, number>): LeadershipResult {
  const total = leadership.questions.reduce((s, _q, i) => s + (responses[i] ?? 0), 0);

  const flagged = leadership.questions
    .map((_q, i) => i)
    .filter((i) => (responses[i] ?? 0) <= 3)
    .map((i) => {
      const meta = LEADERSHIP_FLAG_MAP[i];
      // Find which category this question belongs to
      const category = leadership.subcategories.find((sc) => sc.questionIndices.includes(i))?.name ?? "";
      return { questionIndex: i, category, reportLabel: meta.label, descriptor: meta.descriptor, theme: meta.theme };
    });

  // Group by theme
  const themeMap = new Map<string, string[]>();
  for (const f of flagged) {
    const arr = themeMap.get(f.theme) ?? [];
    arr.push(f.descriptor);
    themeMap.set(f.theme, arr);
  }
  const themeGroups = Array.from(themeMap.entries()).map(([theme, descriptors]) => ({ theme, descriptors }));

  // Strength categories: categories where no question was flagged
  const flaggedCategories = new Set(flagged.map((f) => f.category));
  const strengthCategories = leadership.subcategories
    .map((sc) => sc.name)
    .filter((name) => !flaggedCategories.has(name));

  // Category scores (avg for ranking strengths)
  const categoryScores: ScoredCategory[] = leadership.subcategories.map((sub) => {
    const score = sub.questionIndices.reduce((s, i) => s + (responses[i] ?? 0), 0);
    return {
      name: sub.name,
      score,
      max: sub.questionIndices.length * 5,
      level: score / (sub.questionIndices.length * 5) >= 0.8 ? "Strength" : "Moderate Gap",
    };
  });

  return {
    total,
    flagged: flagged.map(({ questionIndex, category, reportLabel, descriptor }) => ({
      questionIndex,
      category,
      reportLabel,
      descriptor,
    })),
    themeGroups,
    strengthCategories,
    categoryScores,
  };
}

export function scoreBusiness(responses: Record<number, number>): BusinessResult {
  const cats: ScoredCategory[] = businessAudit.subcategories.map((sub) => {
    const i = sub.questionIndices[0];
    const score = responses[i] ?? 0;
    return { name: sub.name, score, max: 5, level: classifyBiz(score) };
  });
  const total = cats.reduce((s, c) => s + c.score, 0);
  return {
    total,
    categories: cats,
    critical: cats.filter((c) => c.level === "Critical Gap"),
    moderate: cats.filter((c) => c.level === "Moderate Gap"),
    developing: cats.filter((c) => c.level === "Developing"),
    strengths: cats.filter((c) => c.level === "Strength"),
  };
}

/* ─── PRE-WRITTEN INDICATORS & NARRATIVES (Inner Capacity) ───── */

interface CategoryContent {
  critical: { indicators: string[]; whatThisMeans: string };
  moderate: { indicators: string[]; whatThisMeans: string };
  strength: { indicators: string[] };
}

export const IC_CONTENT: Record<string, CategoryContent> = {
  "Energy & Recovery": {
    critical: {
      indicators: [
        "Low energy reserves",
        "Inconsistent recovery",
        "Signs of operating in a depleted state",
        "Recovery and recharge habits not adequately supporting performance",
      ],
      whatThisMeans:
        "This is your biggest constraint. Not leadership skill. Not strategy. Not effort. You are operating in a depleted state. And when energy is low: clarity drops, patience drops, decision-making weakens, and leadership becomes reactive. You can push. But you cannot sustain at a high level right now.",
    },
    moderate: {
      indicators: [
        "Inconsistent energy levels",
        "Lack of full recovery rhythm",
        "Periods of fatigue impacting consistency",
      ],
      whatThisMeans:
        "You are not operating at full capacity. And when energy is inconsistent: focus drops, follow-through weakens, and leadership consistency becomes unpredictable.",
    },
    strength: {
      indicators: [
        "Strong energy management",
        "Consistent recovery habits",
        "Operating from a replenished and stable state",
      ],
    },
  },
  "Stability & Structure": {
    critical: {
      indicators: [
        "Boundaries are weak",
        "Rhythm is inconsistent",
        "Planning is not fully structured",
      ],
      whatThisMeans:
        "This is creating reactive workdays and a lack of control over time and energy. Without structure, every other gap gets harder to close. You are working against yourself.",
    },
    moderate: {
      indicators: [
        "Lack of consistent routines",
        "Weak or inconsistent structure to days and weeks",
        "Systems not fully supporting execution",
      ],
      whatThisMeans:
        "You are operating without enough structure to stabilize your performance. And when structure is weak: you react instead of lead, priorities compete instead of align, and output becomes inconsistent.",
    },
    strength: {
      indicators: [
        "Consistent daily and weekly rhythms",
        "Clear structure supporting execution",
        "Strong boundaries protecting performance",
      ],
    },
  },
  "Support & Connection": {
    critical: {
      indicators: [
        "Operating with limited support",
        "Challenges being carried alone",
        "Isolation reducing perspective and resilience",
      ],
      whatThisMeans:
        "You are carrying more than you need to. Without connection and honest support, problems compound and perspective narrows. Leadership becomes harder and lonelier than it has to be.",
    },
    moderate: {
      indicators: [
        "Support exists but honesty and vulnerability are limited",
        "Not fully leveraging relationships",
        "Carrying more than necessary",
      ],
      whatThisMeans:
        "Support is present but not fully activated. You are not using your relationships as a real resource — and that limits your ability to lead effectively and recover from challenges.",
    },
    strength: {
      indicators: [
        "Strong relationships and high trust",
        "Not isolated in challenges",
        "Solid connection to others supporting performance",
      ],
    },
  },
  "Self-Trust & Follow-Through": {
    critical: {
      indicators: [
        "Self-doubt limiting action and decision-making",
        "Commitments to self not consistently kept",
        "Inconsistent follow-through undermining confidence",
      ],
      whatThisMeans:
        "You are working against yourself. When you don't trust your own word, hesitation becomes the default — and hesitation costs results. The gap between knowing what to do and actually doing it is what's holding you back.",
    },
    moderate: {
      indicators: [
        "Follow-through inconsistent under pressure",
        "Self-trust fluctuates with circumstances",
        "Commitments made but not always honored",
      ],
      whatThisMeans:
        "You have the capability but the follow-through is not reliable enough. When self-trust wavers, execution becomes conditional — and conditional execution produces inconsistent results.",
    },
    strength: {
      indicators: [
        "Strong follow-through and self-trust",
        "Commitments made and kept",
        "Execution is consistent and reliable",
      ],
    },
  },
  "Purpose & Direction": {
    critical: {
      indicators: [
        "Unclear personal vision guiding decisions",
        "Daily actions disconnected from long-term goals",
        "Operating without a strong sense of why",
      ],
      whatThisMeans:
        "Without clear direction, everything is equally urgent and nothing is truly important. You are working hard but not necessarily toward the right things. Effort without purpose produces motion, not momentum.",
    },
    moderate: {
      indicators: [
        "Vision exists but not consistently guiding decisions",
        "Clarity about direction fluctuates",
        "Purpose present but not fully anchored day-to-day",
      ],
      whatThisMeans:
        "You have a sense of direction but it is not consistently driving your choices. When purpose is not the anchor, drift happens — and drift produces inconsistent output.",
    },
    strength: {
      indicators: [
        "Clear personal vision and purpose",
        "Daily decisions connected to long-term direction",
        "Strong sense of why fueling performance",
      ],
    },
  },
};

/* Diagnosis sentence templates by primary gap */
export function diagnosisFor(primary: ScoredCategory, secondary: ScoredCategory | null): string {
  const lvl = primary.level === "Critical Gap" ? "At Risk" : "Moderate";
  const base = (() => {
    if (primary.name === "Energy & Recovery") {
      return lvl === "At Risk"
        ? "This is a **capacity-driven performance constraint.**"
        : "This is a **capacity and consistency gap.**";
    }
    if (primary.name === "Stability & Structure")
      return "This is a **stability, structure, and execution consistency gap.**";
    if (primary.name === "Support & Connection")
      return "This is a **connection and support gap limiting your leadership.**";
    if (primary.name === "Self-Trust & Follow-Through")
      return "This is a **self-trust and execution gap.**";
    if (primary.name === "Purpose & Direction")
      return "This is a **direction and purpose clarity gap.**";
    return "This is a **capacity-driven performance constraint.**";
  })();

  if (secondary) {
    return base + " It is compounded by a gap in **" + secondary.name + "**.";
  }
  return base;
}

/* ─── Legacy compatibility shims (used by older UI bits) ───── */

export function gapLabel(score: number): GapLevel {
  // Treat as percentage 0-100 for UI cards
  if (score >= 80) return "Strength";
  if (score >= 60) return "Moderate Gap";
  return "Critical Gap";
}

export function calculateScores(
  type: AssessmentType,
  responses: Record<number, number>
): {
  subcategoryScores: Record<string, number>;
  overall: number;
  primary_gap: string | null;
  primary_gap_score: number | null;
  primary_gap_level: string | null;
  secondary_gap: string | null;
  secondary_gap_score: number | null;
  overall_level: string | null;
} {
  if (type === "inner_capacity") {
    const r = scoreInnerCapacity(responses);
    const subs: Record<string, number> = {};
    r.categories.forEach((c) => (subs[c.name] = c.score));
    return {
      subcategoryScores: subs,
      overall: r.total,
      primary_gap: r.primary.name,
      primary_gap_score: r.primary.score,
      primary_gap_level: r.primary.level,
      secondary_gap: r.secondary?.name ?? null,
      secondary_gap_score: r.secondary?.score ?? null,
      overall_level: r.level,
    };
  }
  if (type === "personal_leadership") {
    const r = scoreLeadership(responses);
    const subs: Record<string, number> = {};
    r.categoryScores.forEach((c) => (subs[c.name] = c.score));
    return {
      subcategoryScores: subs,
      overall: r.total,
      primary_gap: r.themeGroups[0]?.theme ?? null,
      primary_gap_score: null,
      primary_gap_level: r.themeGroups[0] ? "Moderate Gap" : null,
      secondary_gap: r.themeGroups[1]?.theme ?? null,
      secondary_gap_score: null,
      overall_level: null,
    };
  }
  // business_audit
  const r = scoreBusiness(responses);
  const subs: Record<string, number> = {};
  r.categories.forEach((c) => (subs[c.name] = c.score));
  return {
    subcategoryScores: subs,
    overall: r.total,
    primary_gap: r.critical[0]?.name ?? r.moderate[0]?.name ?? null,
    primary_gap_score: r.critical[0]?.score ?? r.moderate[0]?.score ?? null,
    primary_gap_level: r.critical[0] ? "Critical Gap" : r.moderate[0] ? "Moderate Gap" : null,
    secondary_gap: r.critical[1]?.name ?? r.moderate[1]?.name ?? null,
    secondary_gap_score: r.critical[1]?.score ?? r.moderate[1]?.score ?? null,
    overall_level: null,
  };
}