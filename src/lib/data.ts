export const barangayName = "Barangay Maduya";
export const barangayLogoSrc = "/images/logo.png"

export const barangayMission =
  "To deliver responsive, transparent, and inclusive public service that uplifts the lives of every resident of Barangay Maduya.";
export const barangayVision =
  "A safe, progressive, and God-loving community where every resident thrives through good governance and active participation.";

export const GCASH_ACCOUNT_NAME = "Barangay Maduya";

export const CLEARANCE_PURPOSES = [
  "Clearance for Local Employment",
  "Bank / Loan Requirements",
  "Business Clearance",
] as const;

export type ClearancePurposeFees = Record<(typeof CLEARANCE_PURPOSES)[number], number>;

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