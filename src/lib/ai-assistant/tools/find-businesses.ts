import { tool } from "ai";
import { asc, eq } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { businessesTable } from "@/db/schema";
import type { UserLocation } from "@/lib/ai-assistant/tools/get-user-location";
import { formatOperatingHours } from "@/lib/business";
import { parseTimeInput } from "@/lib/court-reservations";
import { distanceInMeters } from "@/lib/geolocation";
import { DAYS_OF_WEEK, type OperatingHours } from "@/schemas/business-schema";

// Enough for a barangay's businesses without filling the model's context.
const MAX_BUSINESSES = 50;
const MAX_DESCRIPTION_LENGTH = 200;

// e.g. 340 → "340 m", 1250 → "1.3 km"
function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

// The day (index into DAYS_OF_WEEK) and minutes after midnight in the Philippines. The server runs
// in UTC, and the Philippines is UTC+8 all year, so this reads a date 8 hours ahead in UTC.
function getPhilippineTime() {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return { day: (shifted.getUTCDay() + 6) % 7, minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

// Hours that close at or before the opening time run past midnight (e.g. 6:00 PM – 2:00 AM), so
// those count the early hours of the next day. The same opening and closing time is open all day.
function isOpenAt({ days, opens, closes }: OperatingHours, { day, minutes }: { day: number; minutes: number }) {
  const open = parseTimeInput(opens);
  const close = parseTimeInput(closes);
  if (open === null || close === null) return false;
  const isOpenDay = (index: number) => days.includes(DAYS_OF_WEEK[(index + 7) % 7]);
  if (open < close) return isOpenDay(day) && minutes >= open && minutes < close;
  return (isOpenDay(day) && minutes >= open) || (isOpenDay(day - 1) && minutes < close);
}

// Like calculateCourtFee, this shows no button; the model answers from its result. It lists every
// business and leaves the matching to the model, which can tell that a business described as
// "lutong-bahay na ulam" is a karinderya. A keyword search can't, and with a category filter the
// model filtered "any business or store" down to Others and found nothing.
export function buildFindBusinessesTool(userLocation: UserLocation | null) {
  return tool({
    description:
      "List the businesses verified in the Community Hub, the barangay's directory of local businesses, with their " +
      "category, description, hours, whether they're open right now, contact number and address. Match the user's question to them yourself from " +
      "their names, categories and descriptions. Once the user has shared their location (getUserLocation), the " +
      "list is sorted nearest first and includes distances.",
    inputSchema: z.object({}),
    execute: async () => {
      const rows = await db
        .select({
          id: businessesTable.id,
          name: businessesTable.name,
          category: businessesTable.category,
          description: businessesTable.description,
          contactNumber: businessesTable.contactNumber,
          operatingHours: businessesTable.operatingHours,
          location: businessesTable.location,
        })
        .from(businessesTable)
        .where(eq(businessesTable.status, "Verified"))
        .orderBy(asc(businessesTable.name));

      const businesses = rows.map((business) => ({
        ...business,
        distance: userLocation && business.location ? distanceInMeters(userLocation, business.location.coordinates) : null,
      }));
      // Nearest first, with businesses that have no saved location last.
      if (userLocation) businesses.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

      const instructions = [
        userLocation
          ? "Distances are in a straight line, so give them as approximate, e.g. \"about 300 m away\"."
          : "You don't have the user's location, so you can't tell which business is nearest: in any language, don't call any of them the nearest or closest, or say how far they are. If they asked for the nearest, start by saying you couldn't get their location, then give the address of each business that fits.",
        "Answer only from these businesses, and mention only the ones whose name, category or description fits what the user asked for. Leave the others out entirely, even if that leaves just one, rather than listing them with a note or adding details they don't have. If none fit, say no business verified in the Community Hub matches.",
        "openNow says whether a business is open at this moment, so use it instead of the hours to say whether one is open now.",
        businesses.length > MAX_BUSINESSES &&
          `Only the first ${MAX_BUSINESSES} of ${businesses.length} are listed. If the answer may be among the rest, mention that the Community Hub page lists them all.`,
        "This result shows no button. If your answer is about specific businesses (up to 3), call openBusinessDetails with their ids next, so the user gets a button to open each one's full details.",
      ];

      const now = getPhilippineTime();
      return {
        total: businesses.length,
        businesses: businesses.slice(0, MAX_BUSINESSES).map((business) => ({
          id: business.id,
          name: business.name,
          category: business.category,
          description:
            business.description.length > MAX_DESCRIPTION_LENGTH
              ? `${business.description.slice(0, MAX_DESCRIPTION_LENGTH)}…`
              : business.description,
          hours: formatOperatingHours(business.operatingHours),
          openNow: isOpenAt(business.operatingHours, now),
          contactNumber: business.contactNumber,
          address: business.location?.address || "Not listed",
          ...(business.distance !== null && { distance: formatDistance(business.distance) }),
        })),
        buttonShown: false,
        instruction: instructions.filter(Boolean).join(" "),
      };
    },
  });
}
