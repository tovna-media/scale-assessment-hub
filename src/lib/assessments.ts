export type AssessmentType = "inner_capacity" | "personal_leadership" | "business_audit";

export interface Subcategory {
  name: string;
  questionIndices: number[]; // 0-based
}

export interface AssessmentDef {
  type: AssessmentType;
  title: string;
  shortTitle: string;
  tagline: string;
  questions: string[];
  subcategories: Subcategory[];
}

export const ASSESSMENTS: Record<AssessmentType, AssessmentDef> = {
  inner_capacity: {
    type: "inner_capacity",
    title: "SCALE Inner Capacity Assessment",
    shortTitle: "Inner Capacity",
    tagline: "Can you handle the weight of leadership?",
    questions: [
      "I regularly have the energy to do what my life requires.",
      "I am getting adequate rest and recovery.",
      "I have the emotional capacity to handle stress without shutting down.",
      "I prioritize my physical health consistently.",
      "I recognize the signs of burnout and take action early.",
      "My schedule has structure that protects my most important work.",
      "I have boundaries that protect my time and energy.",
      "I feel supported by at least one person in my life.",
      "I trust myself to follow through on what I commit to.",
      "I feel aligned with what I am working toward.",
    ],
    subcategories: [
      { name: "Energy & Recovery", questionIndices: [0, 1] },
      { name: "Physiological Capacity", questionIndices: [2, 3] },
      { name: "Stability & Structure", questionIndices: [4, 5] },
      { name: "Support & Boundaries", questionIndices: [6, 7] },
      { name: "Self-Trust & Follow-Through", questionIndices: [8, 9] },
    ],
  },
  personal_leadership: {
    type: "personal_leadership",
    title: "SCALE Personal Leadership Assessment",
    shortTitle: "Personal Leadership",
    tagline: "Can you lead with clarity and consistency?",
    questions: [
      "I manage my emotions well under pressure.",
      "I consider other people's perspectives before I respond.",
      "I actively coach and develop the people I lead.",
      "I invest in the growth of my team members intentionally.",
      "I have a clear long-term vision and I communicate it well.",
      "I model the follow-through I expect from others.",
      "I create an environment where people feel safe to speak up.",
      "I communicate clearly, even when the conversation is hard.",
      "People trust me to lead with integrity.",
    ],
    subcategories: [
      { name: "Emotional Intelligence", questionIndices: [0, 1] },
      { name: "People Development", questionIndices: [2, 3] },
      { name: "Vision Clarity", questionIndices: [4] },
      { name: "Accountability Consistency", questionIndices: [5] },
      { name: "Culture Building", questionIndices: [6] },
      { name: "Communication", questionIndices: [7] },
      { name: "Integrity & Trust", questionIndices: [8] },
    ],
  },
  business_audit: {
    type: "business_audit",
    title: "SCALE Business Audit",
    shortTitle: "Business Audit",
    tagline: "Can your business grow without depending on you?",
    questions: [
      "Our message is clear and reaches the right people.",
      "We have systems for coaching and developing team members.",
      "Our team is aligned around the same goals.",
      "Communication is clear and consistent across the business.",
      "Leads are being converted into clients consistently.",
      "Our systems help the business run without depending on one person.",
      "The business has healthy financial habits and visibility.",
      "Our culture supports growth, accountability, and trust.",
      "Customers consistently have a strong experience with us.",
      "The business can move forward without me being involved in every decision.",
    ],
    subcategories: [
      { name: "Marketing", questionIndices: [0] },
      { name: "Coaching & Development Systems", questionIndices: [1] },
      { name: "Goal Alignment", questionIndices: [2] },
      { name: "Communication Alignment", questionIndices: [3] },
      { name: "Lead Conversion Consistency", questionIndices: [4] },
      { name: "Systems Optimization", questionIndices: [5] },
      { name: "Financial Health", questionIndices: [6] },
      { name: "Culture Foundation", questionIndices: [7] },
      { name: "Customer Experience", questionIndices: [8] },
      { name: "Personal Growth & Independence", questionIndices: [9] },
    ],
  },
};

export const ASSESSMENT_LIST: AssessmentDef[] = [
  ASSESSMENTS.inner_capacity,
  ASSESSMENTS.personal_leadership,
  ASSESSMENTS.business_audit,
];

export function calculateScores(
  type: AssessmentType,
  responses: Record<number, number>
): { subcategoryScores: Record<string, number>; overall: number } {
  const def = ASSESSMENTS[type];
  const subcategoryScores: Record<string, number> = {};
  for (const sub of def.subcategories) {
    const values = sub.questionIndices.map((i) => responses[i] ?? 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    subcategoryScores[sub.name] = Math.round(avg * 20); // 1-5 -> 20-100
  }
  const allSub = Object.values(subcategoryScores);
  const overall = Math.round(allSub.reduce((a, b) => a + b, 0) / allSub.length);
  return { subcategoryScores, overall };
}

export function gapLabel(score: number): "Strength" | "Moderate Gap" | "Critical Gap" {
  if (score >= 80) return "Strength";
  if (score >= 60) return "Moderate Gap";
  return "Critical Gap";
}