export const barangayName = "Barangay Maduya";
export const barangayLogoSrc = "/images/logo.png"
export const barangayCity = "City of Carmona, Cavite";

// Fallback contact details used to seed/backfill barangay_settings; the live values are
// editable by admins in Barangay Settings and shown on the public pages' hotline bar and
// the landing page.
export const barangayHotline1 = "(046) 412 4977";
export const barangayHotline2 = "(046) 412 7218";
export const barangayEmail = "barangay9maduya@gmail.com";
export const barangayAddress = "Barangay Hall, Maduya, City of Carmona, Cavite";

export const barangayGoal =
  "To build a united, safe, and self-reliant Barangay Maduya by improving public services, livelihood, health, and the environment for all residents.";
export const barangayMission =
  "To deliver responsive, transparent, and inclusive public service that uplifts the lives of every resident of Barangay Maduya.";
export const barangayVision =
  "A safe, progressive, and God-loving community where every resident thrives through good governance and active participation.";

export const GCASH_ACCOUNT_NAME = "Barangay Maduya";

// Paid purposes have admin-editable fees in barangay_settings; free purposes are always ₱0.
export const PAID_CLEARANCE_PURPOSES = [
  "Clearance for Local Employment",
  "Bank / Loan Requirements",
  "Business Clearance",
] as const;

export const FREE_CLEARANCE_PURPOSES = [
  "Scholarship",
  "Financial Support",
  "Hospital Support",
  "PAO (Public Attorney's Office)",
] as const;

export const CLEARANCE_PURPOSES = [...PAID_CLEARANCE_PURPOSES, ...FREE_CLEARANCE_PURPOSES] as const;

export type ClearancePurposeFees = Record<(typeof PAID_CLEARANCE_PURPOSES)[number], number>;

export function isFreeClearancePurpose(purpose: string): boolean {
  return (FREE_CLEARANCE_PURPOSES as readonly string[]).includes(purpose);
}

// Fallback values used to seed/backfill barangay_settings; the live values editable by
// admins in the document request and court reservation portals (src/actions/settings.ts)
// take precedence.
export const DEFAULT_GCASH_NUMBER = "0917-123-4567";

export const DEFAULT_CLEARANCE_PURPOSE_FEES: ClearancePurposeFees = {
  "Clearance for Local Employment": 60,
  "Bank / Loan Requirements": 80,
  "Business Clearance": 1000,
};

export const DEFAULT_COURT_DAY_RATE = 50;
export const DEFAULT_COURT_NIGHT_RATE = 100;

export function getCourtRateForHour(hour: number, dayRate: number, nightRate: number): number {
  return hour >= 6 && hour < 18 ? dayRate : nightRate;
}