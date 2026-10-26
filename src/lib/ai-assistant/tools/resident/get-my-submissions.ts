import { tool } from "ai";
import { count, desc, eq, inArray, or } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import {
  businessesTable,
  complaintFollowersTable,
  complaintsTable,
  courtReservationsTable,
  documentRequestsTable,
} from "@/db/schema";
import { PORTAL_NAVIGATION_TARGETS } from "@/lib/ai-assistant/portal-navigation";
import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
import {
  formatBusiness,
  formatComplaint,
  formatCourtReservation,
  formatDocumentRequest,
  LIST_DESCRIPTIONS,
  MAX_PER_KIND,
} from "@/lib/ai-assistant/tools/submissions";
import { ONLINE_SOFT_COPY_DELIVERY_METHOD, PICKUP_DELIVERY_METHOD } from "@/lib/document-requests";
import { formatPhilippineDate } from "@/lib/utils";

// Like findBusinesses, this shows no button; the model answers from its result and then calls
// openSubmissionDetails. `userId` comes from the signed-in session, never from the model, so it
// only ever returns the user's own submissions (and the complaints they follow).
export function buildGetMySubmissionsTool({ userId }: AssistantToolContext) {
  return tool({
    description:
      "List the user's own submissions with their current status and the barangay's reply: document requests, " +
      "complaints (including ones they follow), court reservations and Community Hub businesses. Use it for " +
      "questions like \"what's the status of my clearance?\", \"is my document ready?\" or \"why was my reservation rejected?\". " +
      "It has only the user's own submissions, so don't use it for questions about other residents' submissions or " +
      "the barangay's totals.",
    inputSchema: z.object({}),
    execute: async () => {
      const isOwnDocumentRequest = eq(documentRequestsTable.requesterId, userId);
      const isOwnComplaint = eq(complaintsTable.complainantId, userId);
      const isFollowedComplaint = inArray(
        complaintsTable.id,
        db
          .select({ id: complaintFollowersTable.complaintId })
          .from(complaintFollowersTable)
          .where(eq(complaintFollowersTable.userId, userId))
      );
      const isOwnCourtReservation = eq(courtReservationsTable.requesterId, userId);
      const isOwnBusiness = eq(businessesTable.ownerId, userId);

      const [
        documentRequests,
        complaints,
        courtReservations,
        businesses,
        [documentRequestCount],
        [complaintCount],
        [followedComplaintCount],
        [courtReservationCount],
        [businessCount],
      ] = await Promise.all([
        db
          .select()
          .from(documentRequestsTable)
          .where(isOwnDocumentRequest)
          .orderBy(desc(documentRequestsTable.createdAt))
          .limit(MAX_PER_KIND),
        db
          .select()
          .from(complaintsTable)
          .where(or(isOwnComplaint, isFollowedComplaint))
          .orderBy(desc(complaintsTable.createdAt))
          .limit(MAX_PER_KIND),
        db
          .select()
          .from(courtReservationsTable)
          .where(isOwnCourtReservation)
          .orderBy(desc(courtReservationsTable.createdAt))
          .limit(MAX_PER_KIND),
        db
          .select()
          .from(businessesTable)
          .where(isOwnBusiness)
          .orderBy(desc(businessesTable.createdAt))
          .limit(MAX_PER_KIND),
        db.select({ count: count() }).from(documentRequestsTable).where(isOwnDocumentRequest),
        db.select({ count: count() }).from(complaintsTable).where(isOwnComplaint),
        db.select({ count: count() }).from(complaintsTable).where(isFollowedComplaint),
        db.select({ count: count() }).from(courtReservationsTable).where(isOwnCourtReservation),
        db.select({ count: count() }).from(businessesTable).where(isOwnBusiness),
      ]);

      const lists = {
        documentRequests: documentRequests.map(formatDocumentRequest),
        // In separate lists: with a `following` flag on each complaint, the model called a followed
        // complaint the user's own.
        complaints: complaints.filter((complaint) => complaint.complainantId === userId).map(formatComplaint),
        followedComplaints: complaints.filter((complaint) => complaint.complainantId !== userId).map(formatComplaint),
        courtReservations: courtReservations.map(formatCourtReservation),
        businesses: businesses.map(formatBusiness),
      };
      // How many the user has of each in all, since the lists stop at MAX_PER_KIND. Without them,
      // "ilan lahat ng complaints ko?" got the number listed.
      const counts = {
        documentRequests: documentRequestCount.count,
        complaints: complaintCount.count,
        followedComplaints: followedComplaintCount.count,
        courtReservations: courtReservationCount.count,
        businesses: businessCount.count,
      };
      // What the reply has to say about each list that stops before the user's older submissions.
      // As a quoted sentence, the model copied it in English even into a Filipino reply.
      const cutOffNotes = (Object.keys(lists) as (keyof typeof lists)[])
        .filter((list) => counts[list] > lists[list].length)
        .map((list) => {
          const { name, page } = LIST_DESCRIPTIONS[list];
          return `they have ${counts[list]} ${name}, but you can only show their ${lists[list].length} most recent here, and the ${PORTAL_NAVIGATION_TARGETS[page].label} page lists them all`;
        });

      // A list of more than MAX_RECORD_BUTTONS (openSubmissionDetails) gets no buttons. With buttons for
      // the first 3, the model left the cut-off out of "show me all my requests", or listed only
      // the ones with a button.
      const instructions = [
        "Answer only from these submissions, and only about the ones the user asked about. Mention each one's reference number. If none match, say you couldn't find that submission among theirs. When they ask for all of them, or all of one kind, list every matching one here.",
        `A "${PICKUP_DELIVERY_METHOD}" document request that is Ready for Pickup is claimed at the barangay hall. An "${ONLINE_SOFT_COPY_DELIVERY_METHOD}" one that is Ready for Pickup is received by opening it in the portal.`,
        "followedComplaints were filed by other residents about the same issue as the user's, and the user follows them for updates. A question about the user's complaints is about complaints, which they filed themselves. Bring up a followed one only when it's the one they're asking about, and call it the complaint they follow, never their own.",
        "counts has how many of each the user has in all. Use it for how many they have, never the number listed.",
        cutOffNotes.length > 0 &&
          `Only the ${MAX_PER_KIND} most recent of each kind are listed. Whenever your answer lists or counts a kind below, or the one asked about isn't listed, tell the user what's below for that kind: ${cutOffNotes.join("; ")}.`,
        "This result shows no button, so don't mention one unless you call openSubmissionDetails. If your answer is about 1 to 3 specific submissions of any kind, businesses included, call openSubmissionDetails with their reference numbers next (e.g. \"DR-12\", \"CH-3\"), so the user gets a button to open each one's full details and attachments. If it lists more, don't call it, so there are no buttons: say they can open each one from its page instead.",
      ];

      return {
        today: formatPhilippineDate(new Date()),
        counts,
        ...lists,
        buttonShown: false,
        instruction: instructions.filter(Boolean).join(" "),
      };
    },
  });
}
