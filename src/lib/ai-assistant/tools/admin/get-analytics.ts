import { tool } from "ai";
import z from "zod";
import { type BreakdownItem, getAnalyticsFirstMonth, getMonthlyAnalytics, type MonthlyCounts } from "@/actions/analytics";
import { formatMonth, getCurrentMonth, shiftMonth } from "@/lib/analytics";
import { formatFee } from "@/lib/court-reservations";

type CountKey = keyof Omit<MonthlyCounts, "month">;

// The Analytics page's summary tiles.
const COUNT_KEYS: CountKey[] = [
  "documentRequests",
  "complaints",
  "courtReservations",
  "businesses",
  "newsPosts",
  "newUsers",
];

function isMonthValue(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

// e.g. "2026-11 (November 2026, this month), 2026-10 (October 2026, last month), 2026-09 (September
// 2026), …", like findAuditLogs' past week, so the model looks up "noong Setyembre" or "last month"
// instead of working out the year.
function describePastMonths(currentMonth: string): string {
  return Array.from({ length: 12 }, (_, i) => {
    const month = shiftMonth(currentMonth, -i);
    const label = i === 0 ? ", this month" : i === 1 ? ", last month" : "";
    return `${month} (${formatMonth(month)}${label})`;
  }).join(", ");
}

// The tiles' "3 more than last month", with the month and its count.
function describeChange(current: number, previous: number, previousMonth: string) {
  const name = formatMonth(previousMonth);
  if (current > previous) return `${current - previous} more than ${name}, which had ${previous}`;
  if (current < previous) return `${previous - current} fewer than ${name}, which had ${previous}`;
  return `The same as ${name}, which had ${previous}`;
}

// e.g. "October 2026 (14)", or every month tied for the most.
function describeBusiest(rows: MonthlyCounts[], key: CountKey) {
  const most = Math.max(...rows.map((row) => row[key]));
  if (most === 0) return "None in any month";
  const months = rows.filter((row) => row[key] === most).map((row) => formatMonth(row.month));
  return `${months.join(", ")} (${most}${months.length > 1 ? " each" : ""})`;
}

function toCounts(items: BreakdownItem[]): Record<string, number> {
  return Object.fromEntries(items.map((item) => [item.label, item.count]));
}

// The Analytics page for the assistant: getMonthlyAnalytics, the page's own report, so the answer
// matches what the admin sees there. Like findTransparencyProjects' budget totals, the arithmetic is
// done in code: the change from the month before (the tiles' comparison), the totals over a span
// of months, and each kind's busiest month, so "ilan ngayong taon?" and "anong buwan ang
// pinakamarami?" don't depend on the model adding up or comparing the trend. It's built per request
// for this month's date, like checkCourtAvailability: the model has no clock.
export function buildGetAnalyticsTool() {
  const currentMonth = getCurrentMonth();

  return tool({
    description:
      "Get the Analytics page's report for a month: how many document requests, complaints, court reservations and " +
      "Community Hub businesses residents submitted, how many news posts were posted and how many new users signed up, " +
      "each compared with the month before; that month's breakdowns by status, document type, complaint priority and " +
      "category, and business category; the approved court reservations' hours and fees; and each month's counts over " +
      "the 12 months up to it, with their totals. Records count toward the month they were submitted. " +
      'Use it for questions like "ilang document requests ngayong buwan?", "dumami ba ang complaints kumpara noong ' +
      'nakaraang buwan?", "anong klase ng complaint ang pinakamarami noong October?", "magkano ang kinita ng court ' +
      'noong September?", "ilan ang bagong users ngayong taon?" or "anong buwan ang may pinakamaraming request?". ' +
      "For how many submissions are in a status now, whenever they were submitted, use getSubmissionOverview instead. " +
      'When the user only wants to see the Analytics page or its charts ("patingin ng analytics"), call navigateToPage ' +
      "for analytics instead. " +
      `The past 12 months are ${describePastMonths(currentMonth)}. For "ngayong buwan", "last month" or a month's ` +
      "name, use its value from this list.",
    inputSchema: z.object({
      month: z
        .string()
        .optional()
        .describe(
          'The month to report on, as "YYYY-MM": this month unless the user asked about another. For a span of ' +
            "months, its last month.",
        ),
      fromMonth: z
        .string()
        .optional()
        .describe(
          'Empty unless the user asked about a span of months ("ngayong taon", "the last 3 months", "January to ' +
            'March"). Then its first month, as "YYYY-MM", at most 11 months before month. This year runs from its ' +
            "January to this month, and a past year from its January to its December.",
        ),
    }),
    execute: async (input) => {
      if (![input.month, input.fromMonth].every((value) => !value || isMonthValue(value))) {
        return { error: 'Send month and fromMonth as "YYYY-MM", or leave them empty.' };
      }
      let month = input.month || currentMonth;
      let fromMonth = input.fromMonth || undefined;
      // A reversed span is swapped, like findAuditLogs' dates.
      if (fromMonth && fromMonth > month) [fromMonth, month] = [month, fromMonth];
      if (month > currentMonth) {
        return {
          error: `${formatMonth(month)} hasn't come yet. Tell the user the reports go up to this month, ${formatMonth(currentMonth)}.`,
        };
      }

      // The page's month picker starts at the first month with records.
      const [report, recordsStart] = await Promise.all([getMonthlyAnalytics(month), getAnalyticsFirstMonth()]);
      if (month < recordsStart) {
        return {
          error: `The portal's records start in ${formatMonth(recordsStart)}, so there's no report for ${formatMonth(month)}. Tell the user that.`,
        };
      }
      if (fromMonth && fromMonth < report.trend[0].month) {
        return {
          error: `fromMonth can be at most 11 months before month (${report.trend[0].month}). Tell the user you can total up to 12 months at a time.`,
        };
      }

      // Months before the first records would be 0s, which read as months nothing happened in.
      const trend = report.trend.filter((row) => row.month >= recordsStart);
      const span = trend.filter((row) => !fromMonth || row.month >= fromMonth);
      const spanMonths =
        span[0].month === month ? formatMonth(month) : `${formatMonth(span[0].month)} to ${formatMonth(month)}`;
      const [previous, shown] = report.trend.slice(-2);
      const monthName = formatMonth(month);
      const isCurrentMonth = month === currentMonth;
      const priorities = toCounts(report.complaints.byPriority);

      // Like getSubmissionOverview, the high-priority count is reported speech filled in by code: the
      // model gave High and Urgent there as "4, at 1 sa mga ito ay urgent". The page shows each
      // record's current status, not what was reviewed that month, but "ilan ang na-verify na
      // businesses noong October?" got "2 businesses were verified in October" every time. With that
      // question and the answer's wording first in the instruction, it's worded right about 2 times in
      // 3, though "ilang court reservations ang na-approve last month?" still gets "1 was approved".
      // A summary called October the busiest month "for all categories" when new users peaked in
      // July, until told each kind's busiest month can differ. Told not to work out percentages, the
      // model did anyway ("100% were approved"), so it isn't told.
      const instructions = [
        `The breakdowns are of the submissions made in ${monthName}, by each one's status now: the report doesn't say when they were reviewed. So a question like "ilan ang na-verify na businesses noong ${monthName}?" or "how many reservations were approved in ${monthName}?" is answered with how many of the ones submitted in ${monthName} have that status now: "Of the 2 businesses submitted in ${monthName}, 2 are now Verified" ("Sa 2 businesses na na-submit noong ${monthName}, 2 na ang Verified"), never "2 were verified in ${monthName}".`,
        `This is the Analytics page's report for ${monthName}${isCurrentMonth ? ", which is still in progress, so say its numbers are so far" : ""}. counts has how many of each there were in it, with comparedWithLastMonth: answer how it changed from that, never by subtracting yourself. byType and byCategory list only the ones that came up, most first.`,
        `When the user asks about high-priority complaints, count the Urgent ones too: tell them ${priorities.High + priorities.Urgent} of ${monthName}'s complaints are high priority, ${priorities.High} High and ${priorities.Urgent} Urgent.`,
        `courtReservations' approvedHoursBooked and approvedFees are from the reservations submitted in ${monthName} that were approved. Give the fees as the approved reservations' fees, even when the user asks how much the court earned.`,
        `trend has each month's counts${trend.length < report.trend.length ? `, from ${formatMonth(recordsStart)}, when the portal's records start` : ""}. span has the totals over ${spanMonths} and each kind's own busiest month in it (they can differ, so never say one month was the busiest for all of them unless busiestMonth says so for each): answer a total or the busiest month from span, never by adding up or comparing trend's numbers yourself. For a total over other months, call this tool again with month and fromMonth.`,
        "This result shows no button, so don't mention one unless you call navigateToPage. If the user wants to see the charts or the page, call navigateToPage for analytics.",
      ];

      return {
        // Said in the instruction as well, "so far" still came up only some of the time.
        month: isCurrentMonth ? `${monthName} (so far)` : monthName,
        counts: Object.fromEntries(
          COUNT_KEYS.map((key) => [
            key,
            { count: shown[key], comparedWithLastMonth: describeChange(shown[key], previous[key], previous.month) },
          ]),
        ),
        documentRequests: {
          byStatus: toCounts(report.documentRequests.byStatus),
          byType: toCounts(report.documentRequests.byType),
        },
        complaints: {
          byStatus: toCounts(report.complaints.byStatus),
          byPriority: priorities,
          byCategory: toCounts(report.complaints.byCategory),
        },
        courtReservations: {
          byStatus: toCounts(report.courtReservations.byStatus),
          approvedHoursBooked: report.courtReservations.approvedHours,
          approvedFees: formatFee(report.courtReservations.approvedFees),
        },
        businesses: {
          byStatus: toCounts(report.businesses.byStatus),
          byCategory: toCounts(report.businesses.byCategory),
        },
        trend: trend.map(({ month: trendMonth, ...counts }) => ({ month: formatMonth(trendMonth), ...counts })),
        span: {
          months: spanMonths,
          totals: Object.fromEntries(COUNT_KEYS.map((key) => [key, span.reduce((sum, row) => sum + row[key], 0)])),
          busiestMonth: Object.fromEntries(COUNT_KEYS.map((key) => [key, describeBusiest(span, key)])),
        },
        buttonShown: false,
        instruction: instructions.join(" "),
      };
    },
  });
}
