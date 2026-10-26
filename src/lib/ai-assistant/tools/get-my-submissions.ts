import { tool } from "ai";
import { desc, eq, inArray, or } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import {
  businessesTable,
  complaintFollowersTable,
  complaintsTable,
  courtReservationsTable,
  documentRequestsTable,
} from "@/db/schema";
import { formatReferenceNumber as formatBusinessReference } from "@/lib/business";
import { formatReferenceNumber as formatComplaintReference } from "@/lib/complaints";
import {
  formatReferenceNumber as formatCourtReservationReference,
  formatFee,
  formatReservationDate,
  formatReservationTime,
} from "@/lib/court-reservations";
import {
  formatReferenceNumber as formatDocumentRequestReference,
  ONLINE_SOFT_COPY_DELIVERY_METHOD,
  PICKUP_DELIVERY_METHOD,
} from "@/lib/document-requests";

// Per kind of submission, most recent first. More than a resident usually has.
const MAX_PER_KIND = 10;
const MAX_MESSAGE_LENGTH = 300;

function truncate(text: string | null) {
  if (!text) return undefined;
  return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…` : text;
}

// The server runs in UTC, so dates are shown in Philippine time explicitly.
function formatPhilippineDate(date: Date, withTime = false) {
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime && { hour: "numeric", minute: "2-digit" }),
  });
}

// Like findBusinesses, this shows no button; the model answers from its result and then calls
// openSubmissionDetails. `userId` comes from the signed-in session, never from the model, so it
// only ever returns the user's own submissions (and the complaints they follow).
export function buildGetMySubmissionsTool(userId: string) {
  return tool({
    description:
      "List the user's own submissions with their current status and the barangay's reply: document requests, " +
      "complaints (including ones they follow), court reservations and Community Hub businesses. Use it for " +
      "questions like \"what's the status of my clearance?\", \"is my document ready?\" or \"why was my reservation rejected?\". " +
      "It has only the user's own submissions, so don't use it for questions about other residents' submissions or " +
      "the barangay's totals, such as an admin asking how many requests are pending: point admins to the page " +
      "where they review them instead.",
    inputSchema: z.object({}),
    execute: async () => {
      const [documentRequests, complaints, courtReservations, businesses] = await Promise.all([
        db
          .select()
          .from(documentRequestsTable)
          .where(eq(documentRequestsTable.requesterId, userId))
          .orderBy(desc(documentRequestsTable.createdAt))
          .limit(MAX_PER_KIND),
        db
          .select()
          .from(complaintsTable)
          .where(
            or(
              eq(complaintsTable.complainantId, userId),
              inArray(
                complaintsTable.id,
                db
                  .select({ id: complaintFollowersTable.complaintId })
                  .from(complaintFollowersTable)
                  .where(eq(complaintFollowersTable.userId, userId))
              )
            )
          )
          .orderBy(desc(complaintsTable.createdAt))
          .limit(MAX_PER_KIND),
        db
          .select()
          .from(courtReservationsTable)
          .where(eq(courtReservationsTable.requesterId, userId))
          .orderBy(desc(courtReservationsTable.createdAt))
          .limit(MAX_PER_KIND),
        db
          .select()
          .from(businessesTable)
          .where(eq(businessesTable.ownerId, userId))
          .orderBy(desc(businessesTable.createdAt))
          .limit(MAX_PER_KIND),
      ]);

      const instructions = [
        "Answer only from these submissions, and only about the ones the user asked about. Mention each one's reference number. If none match, say you couldn't find that submission among theirs.",
        `A "${PICKUP_DELIVERY_METHOD}" document request that is Ready for Pickup is claimed at the barangay hall. An "${ONLINE_SOFT_COPY_DELIVERY_METHOD}" one that is Ready for Pickup is received by opening it in the portal.`,
        "followedComplaints were filed by other residents about the same issue as the user's, and the user follows them for updates. A question about the user's complaints is about complaints, which they filed themselves. Bring up a followed one only when it's the one they're asking about, and call it the complaint they follow, never their own.",
        [documentRequests, complaints, courtReservations, businesses].some((rows) => rows.length === MAX_PER_KIND) &&
          `Only the ${MAX_PER_KIND} most recent of each kind are listed. If the one asked about isn't here, mention that its page lists them all.`,
        "This result shows no button, so don't mention one unless you call openSubmissionDetails. If your answer is about specific submissions (up to 3) of any kind, businesses included, call openSubmissionDetails with their reference numbers next (e.g. \"DR-12\", \"CH-3\"), so the user gets a button to open each one's full details and attachments.",
      ];

      // In separate lists: with a `following` flag on each complaint, the model called a followed
      // complaint the user's own.
      const formatComplaint = (complaint: (typeof complaints)[number]) => ({
        referenceNumber: formatComplaintReference(complaint.id),
        subject: complaint.subject,
        category: complaint.category,
        status: complaint.status,
        resolutionMessage: truncate(complaint.resolutionMessage),
        dismissalReason: truncate(complaint.dismissalReason),
        submitted: formatPhilippineDate(complaint.createdAt),
        lastUpdated: formatPhilippineDate(complaint.updatedAt),
      });

      return {
        today: formatPhilippineDate(new Date()),
        documentRequests: documentRequests.map((request) => ({
          referenceNumber: formatDocumentRequestReference(request.id),
          documentType: request.documentType,
          purpose: request.purpose === "Other" ? request.otherPurpose : request.purpose,
          receiveVia: request.receiveVia,
          preferredClaimAt: request.preferredClaimAt ? formatPhilippineDate(request.preferredClaimAt, true) : undefined,
          status: request.status,
          pickupMessage: truncate(request.pickupMessage),
          rejectionReason: truncate(request.rejectionReason),
          claimedAt: request.claimedAt ? formatPhilippineDate(request.claimedAt, true) : undefined,
          submitted: formatPhilippineDate(request.createdAt),
          lastUpdated: formatPhilippineDate(request.updatedAt),
        })),
        complaints: complaints.filter((complaint) => complaint.complainantId === userId).map(formatComplaint),
        followedComplaints: complaints.filter((complaint) => complaint.complainantId !== userId).map(formatComplaint),
        courtReservations: courtReservations.map((reservation) => ({
          referenceNumber: formatCourtReservationReference(reservation.id),
          date: formatReservationDate(reservation.date),
          time: formatReservationTime(reservation),
          purpose: reservation.purpose,
          total: formatFee(Number(reservation.totalAmount)),
          status: reservation.status,
          rejectionReason: truncate(reservation.rejectionReason),
          submitted: formatPhilippineDate(reservation.createdAt),
        })),
        businesses: businesses.map((business) => ({
          referenceNumber: formatBusinessReference(business.id),
          name: business.name,
          category: business.category,
          status: business.status,
          rejectionReason: truncate(business.rejectionReason),
          submitted: formatPhilippineDate(business.createdAt),
        })),
        buttonShown: false,
        instruction: instructions.filter(Boolean).join(" "),
      };
    },
  });
}
