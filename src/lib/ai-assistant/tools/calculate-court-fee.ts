import { tool } from "ai";
import z from "zod";
import type { BarangaySettingsValues } from "@/actions/settings";
import {
  calculateCourtFee,
  formatFee,
  formatTimeRange,
  getCourtHourCharges,
  MINUTES_PER_DAY,
  parseTimeInput,
} from "@/lib/court-reservations";

// "HH:MM" (or "H:MM") → minutes after midnight. Midnight, the latest a reservation can end,
// may come as "24:00" or "00:00".
function parseCourtEndTime(value: string): number | null {
  if (value === "24:00") return MINUTES_PER_DAY;
  const minutes = parseTimeInput(value.padStart(5, "0"));
  return minutes === 0 ? MINUTES_PER_DAY : minutes;
}

// Unlike navigateToPage and openFormDialog, this one shows no button; the model answers from
// its result. It exists because the model miscounts day- and night-rate hours (it billed
// 4:30 - 7:30 PM as two hours), so it runs the same per-hour billing as the reservation form.
export function buildCalculateCourtFeeTool({ courtDayRate, courtNightRate }: BarangaySettingsValues) {
  return tool({
    description:
      "Calculate what a court reservation costs for specific times, using the same hour-by-hour billing as the " +
      "reservation form. Give the start time and either the end time or the number of hours.",
    inputSchema: z.object({
      startTime: z.string().describe('Start time in 24-hour "HH:MM", e.g. "16:30" for 4:30 PM.'),
      endTime: z
        .string()
        .optional()
        .describe('End time in 24-hour "HH:MM", e.g. "19:30" for 7:30 PM. Leave it out if the user gave a number of hours.'),
      durationHours: z.number().optional().describe("Number of hours, if the user gave that instead of an end time."),
    }),
    execute: async ({ startTime, endTime, durationHours }) => {
      const start = parseTimeInput(startTime.padStart(5, "0"));
      if (start === null) return { error: 'Send startTime in 24-hour "HH:MM", e.g. "16:30".' };

      const end =
        endTime !== undefined
          ? parseCourtEndTime(endTime)
          : durationHours !== undefined
            ? start + durationHours * 60
            : null;
      if (end === null) return { error: 'Send endTime in 24-hour "HH:MM", or durationHours.' };
      if (end <= start || end > MINUTES_PER_DAY) {
        return { error: "Court reservations must end by 12:00 AM (midnight) of the day they start. Tell the user this time can't be booked." };
      }

      const hours = (end - start) / 60;
      if (!Number.isInteger(hours)) {
        return { error: "Court reservations last a whole number of hours. Tell the user this time range can't be booked as is." };
      }

      const charges = getCourtHourCharges(start, hours, courtDayRate, courtNightRate);
      return {
        reservation: formatTimeRange({ start, end }),
        hours: charges.map(
          (charge) => `${formatTimeRange(charge)}: ${charge.isDayRate ? "day" : "night"} rate, ${formatFee(charge.rate)}`,
        ),
        total: formatFee(calculateCourtFee(start, hours, courtDayRate, courtNightRate)),
        // Without this the reply sometimes says "tap the button below" with no button.
        buttonShown: false,
        instruction:
          "Give the total and the breakdown. If the user already said they want to reserve, call openFormDialog for the court reservation form now. Otherwise no button was shown, so if they may want to reserve, ask whether they'd like the reservation form instead of mentioning a button.",
      };
    },
  });
}
