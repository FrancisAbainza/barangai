import { tool } from "ai";
import z from "zod";
import { getTakenTimeRanges } from "@/actions/court-reservations";
import { parseCourtEndTime } from "@/lib/ai-assistant/tools/court-reservation/calculate-court-fee";
import { getPortalDialogHref } from "@/lib/ai-assistant/portal-dialogs";
import { markdownLink } from "@/lib/ai-assistant/tools/links";
import {
  formatCourtTime,
  formatTimeRange,
  getFreeRanges,
  COURT_CLOSE,
  COURT_LAST_START,
  COURT_OPEN_START,
  MINUTES_PER_DAY,
  isBeyondCourtReservationMaxDate,
  isFridayCourtReservationDate,
  parseTimeInput,
  rangesOverlap,
  toTimeInput,
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

function getReservationDateError(value: string, today: string): string | null {
  if (!formatDate(value)) return 'Not a valid date. Send dates as "YYYY-MM-DD".';
  if (value < today) return "This date has passed, so the court can't be reserved for it.";
  if (isFridayCourtReservationDate(value)) return "Court reservations are not available on Fridays.";
  if (isBeyondCourtReservationMaxDate(value)) return "Reservations may only be made up to 3 months from today.";
  return null;
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

// It's built per request because its description has today's date and the coming week: the model has no clock, and
// without them it sent dates from its training years (2023-10-28 for "sa Sabado"). In the `dates`
// field's own description, it ignored them.
// The model passes the hours the user asked about, and this cuts the open times to them. Given the
// whole day, it answered "sa Sabado ng gabi?" with the whole day, and "8 to 10 PM?" without saying
// that a 7 - 9 PM booking was in the way.
export function buildCheckCourtAvailabilityTool() {
  const now = getPhilippineTime();

  return tool({
    description:
      `Today is ${formatDate(now.date)} in the Philippines. ` +
      "Check whether a requested court reservation can be made, or check when the court is free: approved reservations (booked) and the times " +
      "that can still be reserved (available), as shown in the Court Availability dialog on the Court Reservation " +
      'page. Use it for questions like "bakante ba ang court sa Sabado ng gabi?" or "anong oras pa available bukas?". ' +
      "For a reservation, set wantsToReserve to true and send one date, startTime, and durationHours. " +
      "The reservation link is returned only if the date is today through 3 months ahead, not Friday, the start time is between 8:00 AM and 9:00 PM and not past today, the reservation ends by 10:00 PM, and the whole slot is available. " +
      `The coming week is ${describeComingWeek(now.date)}. For "ngayon", "bukas" or a day of the week, use its date from this list.`,
    inputSchema: z.object({
      dates: z.array(z.string()).describe(`Up to ${MAX_DATES} dates to check, as "YYYY-MM-DD"; send one date when reserving.`),
      wantsToReserve: z.boolean().optional().describe("True only when the user wants to book a reservation now."),
      startTime: z
        .string()
        .optional()
        .describe(
          'For a reservation, the requested start time in 24-hour "HH:MM". For availability questions, the start of the period: ' +
            '"06:00" for umaga (morning), "12:00" for hapon (afternoon), "18:00" for gabi (evening), "19:00" for 7 PM. ' +
            "Leave it out for the whole day only when not reserving.",
        ),
      endTime: z
        .string()
        .optional()
        .describe('The end of the requested period in 24-hour "HH:MM", e.g. "12:00", "18:00", or "24:00" for midnight.'),
      durationHours: z.number().int().min(1).optional().describe("The requested whole-hour duration when reserving."),
      purpose: z.string().optional().describe("Include only if the user said what the reservation is for."),
    }),
    execute: async ({ dates, startTime, endTime, durationHours, wantsToReserve, purpose }) => {
      const currentTime = getPhilippineTime();
      const earliestToday = Math.ceil(currentTime.minutes / 30) * 30;
      if (wantsToReserve && dates.length !== 1) {
        return { error: "To check a reservation, send exactly one date and the requested start time and duration." };
      }
      if (wantsToReserve) {
        const dateError = getReservationDateError(dates[0], currentTime.date);
        if (dateError) return { error: dateError };
      }
      const parsedStart = startTime ? parseTimeInput(startTime.padStart(5, "0")) : null;
      const requestedEnd = endTime ? parseCourtEndTime(endTime) : null;
      if (startTime && parsedStart === null) {
        return { error: 'Send startTime in 24-hour "HH:MM", e.g. "16:00".' };
      }
      if (endTime && requestedEnd === null) {
        return { error: 'Send endTime in 24-hour "HH:MM", e.g. "18:00".' };
      }
      const start = parsedStart ?? COURT_OPEN_START;
      const end = wantsToReserve && durationHours !== undefined ? start + durationHours * 60 : requestedEnd ?? COURT_CLOSE;
      if (wantsToReserve && (dates.length !== 1 || !startTime || parsedStart === null || (durationHours === undefined && !endTime))) {
        return { error: "To check a reservation, send exactly one date and the requested start time and duration." };
      }
      if (end <= start) {
        return { error: 'Send startTime and endTime in 24-hour "HH:MM", with endTime after startTime, or leave them out for the whole day.' };
      }
      if (start < COURT_OPEN_START || end > COURT_CLOSE) {
        return { error: "Court availability is from 8:00 AM to 10:00 PM." };
      }
      if (wantsToReserve) {
        const duration = (end - start) / 60;
        if (
          start > COURT_LAST_START ||
          !Number.isInteger(duration) ||
          (durationHours !== undefined && endTime !== undefined && requestedEnd !== end)
        ) {
          return { error: "Reservation start times must be from 8:00 AM to 9:00 PM, end by 10:00 PM, and last a whole number of hours." };
        }
      }
      const hoursChecked = { start, end };

      const days = await Promise.all(
        dates.slice(0, MAX_DATES).map(async (value) => {
          const date = formatDate(value);
          const dateError = getReservationDateError(value, currentTime.date);
          if (dateError) return { date: date ?? value, error: dateError };
          if (wantsToReserve && value === currentTime.date && start < currentTime.minutes) {
            return { date, error: "The requested start time has already passed today." };
          }

          const taken = await getTakenTimeRanges(value);
          const earliest =
            value === currentTime.date
              ? Math.max(start, wantsToReserve ? currentTime.minutes : earliestToday)
              : start;
          const available = getFreeRanges(taken)
            .map((range) => ({ start: Math.max(range.start, earliest), end: Math.min(range.end, end) }))
            // Reservations last a whole number of hours, so a shorter gap can't be reserved.
            .filter((range) => range.end - range.start >= 60);
          const allAvailable = available.length === 1 && available[0].start === start && available[0].end === end;
          return {
            date,
            // Without this, "8 to 10 PM?" got the open 9 - 10 PM and the booking, but never a "no".
            allAvailable,
            available: available.map(formatRange),
            booked: taken.filter((range) => rangesOverlap(range, hoursChecked)).map(formatRange),
          };
        }),
      );

      const checkedDay = days[0];
      if (wantsToReserve && checkedDay && "allAvailable" in checkedDay && checkedDay.allAvailable) {
        const prefill = {
          date: dates[0],
          startTime: toTimeInput(start),
          durationHours: durationHours ?? (end - start) / 60,
          ...(purpose ? { purpose } : {}),
        };
        return {
          hoursChecked: formatRange(hoursChecked),
          days,
          link: markdownLink("Reserve the Court", getPortalDialogHref("court-reservation", prefill)),
          instruction: "All reservation rules passed and the whole requested slot is available. Include this exact form link in your reply.",
        };
      }

      const instructions = [
        "Answer only from these dates, and name each date you answer about with its day of the week.",
        "allAvailable says whether all of hoursChecked can be reserved that day. available has the times within hoursChecked that can still be reserved, and an empty list means none can. booked has the approved reservations during hoursChecked. If the user asked about specific times, start by answering yes or no from allAvailable, and if no, say which booking is in the way and which of those times are still available.",
        dates.includes(currentTime.date) &&
          `Times today before ${formatCourtTime(earliestToday)} have passed, so they aren't in today's available times.`,
        dates.length > MAX_DATES &&
          `Only the first ${MAX_DATES} dates were checked. Tell the user they can check other dates with Court Availability on the Court Reservation page.`,
        wantsToReserve
          ? "The reservation did not pass all checks, so do not provide a form link. Explain the date/time issue or that the slot is unavailable."
          : "If the user may want to reserve, ask whether they'd like to reserve and request the date, start time, and duration.",
      ];

      return {
        hoursChecked: formatRange(hoursChecked),
        days,
        instruction: instructions.filter(Boolean).join(" "),
      };
    },
  });
}
