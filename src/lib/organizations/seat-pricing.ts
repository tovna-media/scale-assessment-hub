// Pure seat-count -> price-tier logic for org signup. No I/O, safe to import
// from client or server (e.g. a live price preview while a roster is built).
//
// Pricing (locked in the build spec): 15 or fewer seats total is $97/seat;
// crossing into 16+ drops the price to $87/seat for the WHOLE roster, not
// just the seats past 15.

export const STANDARD_SEAT_PRICE_CENTS = 9700;
export const DISCOUNTED_SEAT_PRICE_CENTS = 8700;
export const DISCOUNT_THRESHOLD_MEMBER_COUNT = 16;

export type OrgSeatTier = "standard" | "discounted";

export function getSeatTier(memberCount: number): OrgSeatTier {
  return memberCount >= DISCOUNT_THRESHOLD_MEMBER_COUNT ? "discounted" : "standard";
}

export function getSeatPriceCents(memberCount: number): number {
  return getSeatTier(memberCount) === "discounted"
    ? DISCOUNTED_SEAT_PRICE_CENTS
    : STANDARD_SEAT_PRICE_CENTS;
}

export interface OrgPricingSummary {
  memberCount: number;
  tier: OrgSeatTier;
  seatPriceCents: number;
  totalCents: number;
}

export function getOrgPricingSummary(memberCount: number): OrgPricingSummary {
  const tier = getSeatTier(memberCount);
  const seatPriceCents = getSeatPriceCents(memberCount);
  return {
    memberCount,
    tier,
    seatPriceCents,
    totalCents: seatPriceCents * memberCount,
  };
}

// One-by-one entry (as opposed to file upload) is only ever offered up to
// this many rows, regardless of what the org typed into "how many people are
// you adding" -- applies at initial signup and in the management portal.
export const ONE_BY_ONE_ENTRY_CAP = 15;

// The "how many people" prompt only picks which entry method to show
// (file upload vs one-by-one); file upload is required once someone states
// they're adding more than the one-by-one cap allows.
export function requiresFileUpload(statedMemberCount: number): boolean {
  return statedMemberCount > ONE_BY_ONE_ENTRY_CAP;
}
