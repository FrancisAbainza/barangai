import { tool } from "ai";
import { count, inArray } from "drizzle-orm";
import z from "zod";
import { getNeedsAttentionQueue, type NeedsAttentionItem } from "@/actions/home";
import { db } from "@/db/config";
import {
  businessesTable,
  businessStatusEnum,
  complaintPriorityEnum,
  complaintsTable,
  complaintStatusEnum,
  courtReservationsTable,
  courtReservationStatusEnum,
  documentRequestsTable,
  documentRequestStatusEnum,
} from "@/db/schema";
import { formatReferenceNumber as formatBusinessReference } from "@/lib/business";
import { formatReferenceNumber as formatComplaintReference } from "@/lib/complaints";
import { formatReferenceNumber as formatCourtReservationReference } from "@/lib/court-reservations";
import { formatReferenceNumber as formatDocumentRequestReference } from "@/lib/document-requests";
import { formatPhilippineDate } from "@/lib/utils";

const NEEDS_ATTENTION_KINDS = {
  "document-request": { name: "Document request", formatReferenceNumber: formatDocumentRequestReference },
  complaint: { name: "Complaint", formatReferenceNumber: formatComplaintReference },
  "court-reservation": { name: "Court reservation", formatReferenceNumber: formatCourtReservationReference },
  business: { name: "Community Hub business", formatReferenceNumber: formatBusinessReference },
} satisfies Record<NeedsAttentionItem["kind"], { name: string; formatReferenceNumber: (id: number) => string }>;

// How many there are of each status or priority, with the ones that have none as 0, and the total,
// because the model can't be trusted to add them up.
function countEach(values: readonly string[], rows: { value: string; count: number }[]): Record<string, number> {
  return {
    total: rows.reduce((sum, row) => sum + row.count, 0),
    ...Object.fromEntries(values.map((value) => [value, rows.find((row) => row.value === value)?.count ?? 0])),
  };
}

// The admin home page's numbers for the assistant: how many of the residents' submissions are in
// each status, across the barangay, and its Needs Attention list (getNeedsAttentionQueue), so "ano
// ang kailangan kong asikasuhin?" gets the same submissions as that list. getHandledSubmissions has
// only the ones the user is handling, so before this, "ilan ang pending na document requests?" got
// a button to the page instead of a number. Counted per status in one query per table rather than
// through getAdminPendingCounts and the get*Stats actions, which have only the Pending count and
// the total. None of them count complaints by priority.
export const getSubmissionOverviewTool = tool({
  description:
    "Get how many of the residents' document requests, complaints, court reservations and Community Hub businesses " +
    "the barangay has in each status, how many open complaints there are at each priority, and the submissions that " +
    "need attention first (the home page's Needs Attention list). These are every submission in the barangay, " +
    "whoever is handling it. Use it for questions like \"ilan ang pending na document requests?\", \"ilang " +
    "high-priority complaints ang open?\" or \"ano ang kailangan kong asikasuhin ngayon?\".",
  inputSchema: z.object({}),
  execute: async () => {
    const [documentRequests, complaints, courtReservations, businesses, openComplaints, needsAttention] =
      await Promise.all([
        db
          .select({ value: documentRequestsTable.status, count: count() })
          .from(documentRequestsTable)
          .groupBy(documentRequestsTable.status),
        db
          .select({ value: complaintsTable.status, count: count() })
          .from(complaintsTable)
          .groupBy(complaintsTable.status),
        db
          .select({ value: courtReservationsTable.status, count: count() })
          .from(courtReservationsTable)
          .groupBy(courtReservationsTable.status),
        db
          .select({ value: businessesTable.status, count: count() })
          .from(businessesTable)
          .groupBy(businessesTable.status),
        db
          .select({ value: complaintsTable.priority, count: count() })
          .from(complaintsTable)
          .where(inArray(complaintsTable.status, ["Pending", "In Progress"]))
          .groupBy(complaintsTable.priority),
        getNeedsAttentionQueue(),
      ]);

    const openComplaintsByPriority = countEach(complaintPriorityEnum.enumValues, openComplaints);
    const { High: openHigh, Urgent: openUrgent } = openComplaintsByPriority;

    // Asked what needs attention, the model answered with the counts, and put the open complaints'
    // priorities on the Pending ones, until told to list needsAttention and what openComplaints
    // covers. With "more than 3 submissions" as the rule for no button, a count of 5 complaints got
    // none, so it goes by the submissions the reply names. Counts of complaints still get the
    // navigateToPage button only about half the time; the reply names the page either way.
    // "ilang high-priority complaints ang open?" with 4 High and 1 Urgent got "4, at 1 sa mga ito ay
    // urgent", even when told the High count doesn't include Urgent, and about one time in four with
    // a High + Urgent total next to the counts. "ilan ang open na complaints?" got the total of all
    // complaints. So the instruction gives those answers as reported speech filled in by code, like
    // getHandledSubmissions' cut-off notes.
    const instructions = [
      "These are all the residents' submissions in the barangay, not only the ones the user is handling. counts has how many there are of each kind in each status, with the total. Answer how many there are from these, never by counting needsAttention or adding numbers up yourself. Pending means the Pending status only.",
      `openComplaints has how many complaints are open, meaning Pending or In Progress, at each priority. Never give its numbers as the Pending ones. When the user asks how many complaints are open, tell them ${openComplaintsByPriority.total}. When they ask about high-priority complaints, count the Urgent ones as high priority too: tell them ${openHigh + openUrgent} are open, ${openHigh} High and ${openUrgent} Urgent.`,
      "needsAttention is the home page's Needs Attention list: up to 8 submissions still waiting on the barangay (pending or being worked on), urgent complaints first, then the ones that have waited longest. When the user asks what needs attention or what to work on, answer with these submissions in this order, giving each one's reference number, title, and priority or status. It may not have every submission that's waiting.",
      "This result shows no button, so don't mention one unless you call openSubmissionDetails or navigateToPage next. If your answer names 1 to 3 specific submissions, call openSubmissionDetails with their reference numbers (e.g. \"DR-12\", \"CP-3\"). If it's a count of one kind of submission (pending document requests, open high-priority complaints, court reservations waiting for approval, and so on), call navigateToPage for that kind's page, so the user gets a button to review them there. If it's about several kinds, call neither, and say they can open each one from its page.",
    ];

    return {
      today: formatPhilippineDate(new Date()),
      counts: {
        documentRequests: countEach(documentRequestStatusEnum.enumValues, documentRequests),
        complaints: countEach(complaintStatusEnum.enumValues, complaints),
        courtReservations: countEach(courtReservationStatusEnum.enumValues, courtReservations),
        businesses: countEach(businessStatusEnum.enumValues, businesses),
      },
      openComplaints: openComplaintsByPriority,
      // The badge is a complaint's priority, and the others' status. Without the names of the
      // residents who submitted them, like getHandledSubmissions.
      needsAttention: needsAttention.map((item) => {
        const { name, formatReferenceNumber } = NEEDS_ATTENTION_KINDS[item.kind];
        return {
          referenceNumber: formatReferenceNumber(item.recordId),
          kind: name,
          title: item.title,
          ...(item.kind === "complaint" ? { priority: item.badge } : { status: item.badge }),
          submitted: formatPhilippineDate(item.createdAt),
        };
      }),
      buttonShown: false,
      instruction: instructions.join(" "),
    };
  },
});
