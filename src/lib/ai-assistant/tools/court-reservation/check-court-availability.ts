import { tool } from "ai";
import z from "zod";
import { getTakenTimeRanges } from "@/actions/court-reservations";
import { parseCourtEndTime } from "@/lib/ai-assistant/tools/court-reservation/calculate-court-fee";
import {
  formatCourtTime,
  formatTimeRange,
  getFreeRanges,
  MINUTES_PER_DAY,
  parseTimeInput,
  rangesOverlap,
  type CourtTimeRange,
} from "@/lib/court-reservations";
import { getPhilippineTime, parseDateValue, toDateValue } from "@/lib/utils";

// Enough for "this week" or "Saturday or Sunday" in one call. More are ignored.
const MAX_DATES = 7;

// "2026-10-31" → "Saturday, October 31, 2026", or null for anything that isn't a real "YYYY-MM-DD"
// date (e.g. "2026-02-30", which parseDateValue rolls over to March).
function formatDate(value: string): string | null {
  const date = parseDateValue(value);
  return toDateValue(date) === value ? date.toLocaleDateString("en-US", { dateStyle: "full" }) : null;
}

// e.g. "Monday 2026-10-26 (today), Tuesday 2026-10-27 (tomorrow), Wednesday 2026-10-28, …", with
// each day of the week once, so the model looks up "bukas" or "sa Sabado" instead of counting days.
function describeComingWeek(today: string): string {
  return Array.from({ length: 7 }, (_, i) => {
    const date = parseDateValue(today);
    date.setDate(date.getDate() + i);
    const label = i === 0 ? " (today)" : i === 1 ? " (tomorrow)" : "";
    return `${date.toLocaleDateString("en-US", { weekday: "long" })} ${toDateValue(date)}${label}`;
  }).join(", ");
}

// formatTimeRange writes a whole day as "12:00 AM - 12:00 AM", which the model repeated as is.
function formatRange(range: CourtTimeRange): string {
  return range.start === 0 && range.end === MINUTES_PER_DAY ? "The whole day" : formatTimeRange(range);
}

// Like calculateCourtFee, this shows no button; the model answers from its result. It's built per
// request because its description has today's date and the coming week: the model has no clock, and
// without them it sent dates from its training years (2023-10-28 for "sa Sabado"). In the `dates`
// field's own description, it ignored them.
// The model passes the hours the user asked about, and this cuts the open times to them. Given the
// whole day, it answered "sa Sabado ng gabi?" with the whole day, and "8 to 10 PM?" without saying
// that a 7 - 9 PM booking was in the way.
export function buildCheckCourtAvailabilityTool() {
  const now = getPhilippineTime();
  // Today's times that have passed can't be reserved. Rounded up to the half hour, so the reply
  // doesn't say "available from 3:47 PM".
  const earliestToday = Math.ceil(now.minutes / 30) * 30;

  return tool({
    description:
      `Today is ${formatDate(now.date)} in the Philippines. ` +
      "Check when the barangay court is free on given dates: the approved reservations (booked) and the times " +
      "that can still be reserved (available), as shown in the Court Availability dialog on the Court Reservation " +
      'page. Use it for questions like "bakante ba ang court sa Sabado ng gabi?" or "anong oras pa available bukas?". ' +
      `The coming week is ${describeComingWeek(now.date)}. For "ngayon", "bukas" or a day of the week, use its date from this list.`,
    inputSchema: z.object({
      dates: z.array(z.string()).describe(`Up to ${MAX_DATES} dates to check, as "YYYY-MM-DD".`),
      startTime: z
        .string()
        .optional()
        .describe(
          'When the user asks about specific times or part of the day, the start of it in 24-hour "HH:MM": ' +
            '"06:00" for umaga (morning), "12:00" for hapon (afternoon), "18:00" for gabi (evening), "19:00" for 7 PM. ' +
            "Leave it out for the whole day.",
        ),
      endTime: z
        .string()
        .optional()
        .describe('The end of those times in 24-hour "HH:MM", e.g. "12:00", "18:00", or "24:00" for midnight.'),
    }),
    execute: async ({ dates, startTime, endTime }) => {
      const start = startTime ? parseTimeInput(startTime.padStart(5, "0")) : 0;
      const end = endTime ? parseCourtEndTime(endTime) : MINUTES_PER_DAY;
      if (start === null || end === null || end <= start) {
        return { error: 'Send startTime and endTime in 24-hour "HH:MM", with endTime after startTime, or leave them out for the whole day.' };
      }
      const hoursChecked = { start, end };

      const days = await Promise.all(
        dates.slice(0, MAX_DATES).map(async (value) => {
          const date = formatDate(value);
          if (!date) return { date: value, error: 'Not a valid date. Send dates as "YYYY-MM-DD".' };
          if (value < now.date) return { date, error: "This date has passed, so the court can't be reserved for it." };

          const taken = await getTakenTimeRanges(value);
          const earliest = value === now.date ? Math.max(start, earliestToday) : start;
          const available = getFreeRanges(taken)
            .map((range) => ({ start: Math.max(range.start, earliest), end: Math.min(range.end, end) }))
            // Reservations last a whole number of hours, so a shorter gap can't be reserved.
            .filter((range) => range.end - range.start >= 60);
          return {
            date,
            // Without this, "8 to 10 PM?" got the open 9 - 10 PM and the booking, but never a "no".
            allAvailable: available.length === 1 && available[0].start === start && available[0].end === end,
            available: available.map(formatRange),
            booked: taken.filter((range) => rangesOverlap(range, hoursChecked)).map(formatRange),
          };
        }),
      );

      const instructions = [
        "Answer only from these dates, and name each date you answer about with its day of the week.",
        "allAvailable says whether all of hoursChecked can be reserved that day. available has the times within hoursChecked that can still be reserved, and an empty list means none can. booked has the approved reservations during hoursChecked. If the user asked about specific times, start by answering yes or no from allAvailable, and if no, say which booking is in the way and which of those times are still available.",
        dates.includes(now.date) &&
          `Times today before ${formatCourtTime(earliestToday)} have passed, so they aren't in today's available times.`,
        dates.length > MAX_DATES &&
          `Only the first ${MAX_DATES} dates were checked. Tell the user they can check other dates with Court Availability on the Court Reservation page.`,
        "If the user already said they want to reserve (e.g. \"gusto ko mag-reserve\") and allAvailable is true, call openFormDialog for the court reservation form now, before replying, with only the date and times they gave as prefill. Otherwise no button was shown, so if they may want to reserve, ask whether they'd like the reservation form instead of mentioning a button.",
      ];

      return {
        hoursChecked: formatRange(hoursChecked),
        days,
        buttonShown: false,
        instruction: instructions.filter(Boolean).join(" "),
      };
    },
  });
}
