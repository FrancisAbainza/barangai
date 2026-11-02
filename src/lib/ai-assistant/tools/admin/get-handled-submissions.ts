import { tool } from "ai";
import { count, desc, eq } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { businessesTable, complaintsTable, courtReservationsTable, documentRequestsTable } from "@/db/schema";
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
import { formatPhilippineDate } from "@/lib/utils";

// The admins' getMySubmissions (see buildAdminTools). Admins don't request documents or file
// complaints, so with getMySubmissions, "what is the status of my complaints?" found none and
// brought up the admin's business instead. An admin's requests and complaints are the residents'
// ones they're handling, which each admin page's "Only show … I'm handling" filter shows: the ones
// whose status they last changed (`handlerId`). Court reservations and businesses admins submit
// too, so theirs are the ones they submitted, like a resident's. With the residents' ones they
// handle listed as well, even in separate lists, "what's the status of my business?" sometimes
// got a business the admin had only verified.
export function buildGetHandledSubmissionsTool({ userId }: AssistantToolContext) {
  return tool({
    description:
      "List the document requests and complaints the user is handling as an admin (the residents' ones whose status " +
      "they last changed), and the court reservations and Community Hub businesses they submitted themselves, each " +
      "with its current status. Use it for questions like \"what's the status of my complaints?\", \"which requests " +
      "am I handling?\" or \"na-verify na ba yung business ko?\", and when they ask to see them (\"I wanna see the " +
      "document requests I'm handling\"): it lists them in the chat. It doesn't have pending submissions no admin has " +
      "acted on yet, ones other admins are handling, residents' court reservations or businesses, or the barangay's " +
      "totals: getSubmissionOverview has the barangay's totals and what needs attention.",
    inputSchema: z.object({}),
    execute: async () => {
      const isHandledDocumentRequest = eq(documentRequestsTable.handlerId, userId);
      const isHandledComplaint = eq(complaintsTable.handlerId, userId);
      const isOwnCourtReservation = eq(courtReservationsTable.requesterId, userId);
      const isOwnBusiness = eq(businessesTable.ownerId, userId);

      const [
        documentRequests,
        complaints,
        courtReservations,
        businesses,
        [documentRequestCount],
        [complaintCount],
        [courtReservationCount],
        [businessCount],
      ] = await Promise.all([
        db
          .select()
          .from(documentRequestsTable)
          .where(isHandledDocumentRequest)
          .orderBy(desc(documentRequestsTable.createdAt))
          .limit(MAX_PER_KIND),
        db
          .select()
          .from(complaintsTable)
          .where(isHandledComplaint)
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
        db.select({ count: count() }).from(documentRequestsTable).where(isHandledDocumentRequest),
        db.select({ count: count() }).from(complaintsTable).where(isHandledComplaint),
        db.select({ count: count() }).from(courtReservationsTable).where(isOwnCourtReservation),
        db.select({ count: count() }).from(businessesTable).where(isOwnBusiness),
      ]);

      const lists = {
        documentRequests: documentRequests.map(formatDocumentRequest),
        complaints: complaints.map(formatComplaint),
        courtReservations: courtReservations.map(formatCourtReservation),
        businesses: businesses.map(formatBusiness),
      };
      const counts = {
        documentRequests: documentRequestCount.count,
        complaints: complaintCount.count,
        courtReservations: courtReservationCount.count,
        businesses: businessCount.count,
      };
      const cutOffNotes = (Object.keys(lists) as (keyof typeof lists)[])
        .filter((list) => counts[list] > lists[list].length)
        .map((list) => {
          const { name, page } = LIST_DESCRIPTIONS[list];
          const has = list === "documentRequests" || list === "complaints" ? "they're handling" : "they have";
          return `${has} ${counts[list]} ${name}, but you can only show the ${lists[list].length} most recent here, and the ${PORTAL_NAVIGATION_TARGETS[page].label} page lists them all`;
        });

      // The first one first, because further down, "how many complaints are still pending?" got the
      // one the user was handling, which was resolved.
      const instructions = [
        "These are only the document requests and complaints the user is handling and their own court reservations and businesses. Pending submissions no admin has acted on yet, ones other admins are handling and residents' court reservations and businesses aren't here, so if the user asked about those or the barangay's totals, such as how many are pending or what needs attention, don't answer from these: call getSubmissionOverview.",
        "Otherwise, answer only from these submissions, and only about the ones the user asked about. Mention each one's reference number. If they gave a reference number that isn't here, it may be one they aren't handling: link it with ?view= as the system prompt describes. If none match otherwise, say you couldn't find that submission. When they ask for all of them, or all of one kind, list every matching one here.",
        "Admin accounts don't request documents or file complaints, so documentRequests and complaints are residents' ones the user is handling: say they're handling them (e.g. \"You're handling 1 complaint\"), never that they have or filed them. courtReservations and businesses are the user's own.",
        "counts has how many of each kind there are in all. Use it for how many there are, never the number listed.",
        cutOffNotes.length > 0 &&
          `Only the ${MAX_PER_KIND} most recent of each kind are listed. Whenever your answer lists or counts a kind below, or the one asked about isn't listed, tell the user what's below for that kind: ${cutOffNotes.join("; ")}.`,
        "Each submission's link opens it on its page. Give the links of the ones your answer names, up to 3, even when they're all the user has. If it lists more, give none: say they can open each one from its page instead.",
      ];

      return {
        today: formatPhilippineDate(new Date()),
        counts,
        ...lists,
        instruction: instructions.filter(Boolean).join(" "),
      };
    },
  });
}
