/**
 * Section drip schedule for the Optimized Leader Guide.
 *
 * Rules (see product spec):
 * - Section 1 unlocks the instant the cycle starts (gap report generated).
 * - Section N (2..12) unlocks when BOTH are true:
 *     1. Its weekly date has arrived — Monday of week N of the cycle at
 *        6am the member's LOCAL time. Week 1 is the calendar week that
 *        contains the cycle start; week N Monday = Monday of week 1 + (N-1)*7d.
 *     2. The previous section (N-1) has been marked complete.
 *
 * Completing a section never, on its own, unlocks the next one.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Monday 00:00 local of the week containing `d` (local time). */
function mondayOfWeekLocal(d: Date): Date {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = local.getDay(); // 0=Sun..6=Sat
  const daysFromMonday = (dow + 6) % 7; // Mon=0, Sun=6
  local.setDate(local.getDate() - daysFromMonday);
  return local;
}

/**
 * Unlock instant for a section, in the member's local timezone.
 * Returns null for section 1 (always available at cycle start).
 */
export function sectionUnlockAt(cycleStart: Date, sectionNumber: number): Date | null {
  if (sectionNumber <= 1) return null;
  const week1Monday = mondayOfWeekLocal(cycleStart);
  const target = new Date(week1Monday.getTime() + (sectionNumber - 1) * WEEK_MS);
  target.setHours(6, 0, 0, 0); // 6am local
  return target;
}

export interface SectionUnlockStatus {
  unlockAt: Date | null;
  weekReached: boolean;
  prevComplete: boolean;
  unlocked: boolean;
}

export function sectionUnlockStatus(
  cycleStart: Date | null,
  sectionNumber: number,
  prevComplete: boolean,
  now: Date = new Date(),
): SectionUnlockStatus {
  if (!cycleStart) {
    return { unlockAt: null, weekReached: false, prevComplete, unlocked: false };
  }
  if (sectionNumber === 1) {
    return { unlockAt: null, weekReached: true, prevComplete: true, unlocked: true };
  }
  const unlockAt = sectionUnlockAt(cycleStart, sectionNumber);
  const weekReached = unlockAt !== null && now.getTime() >= unlockAt.getTime();
  return {
    unlockAt,
    weekReached,
    prevComplete,
    unlocked: weekReached && prevComplete,
  };
}

export function formatUnlockDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}