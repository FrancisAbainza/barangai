import { and, eq, inArray, or } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import {
  businessesTable,
  complaintFollowersTable,
  complaintsTable,
  courtReservationsTable,
  documentRequestsTable,
} from "@/db/schema";
import { getSubmissionDialogHref } from "@/lib/ai-assistant/portal-dialogs";
import type { PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";
import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
import { buttonTool, MAX_RECORD_BUTTONS } from "@/lib/ai-assistant/tools/buttons";
import { formatReservationDate } from "@/lib/court-reservations";

// The reference number prefixes (createReferenceNumbers in each domain's lib) and the page whose
// `?view=<id>` opens that kind of submission's Submission Info dialog.
const REFERENCE_PREFIX_PAGES = {
  DR: "document-request",
  CP: "complaint",
  CR: "court-reservation",
  CH: "community-hub",
} as const satisfies Record<string, PortalNavigationTargetId>;

// The button's label for one of the user's submissions, or null if it isn't theirs (or doesn't exist).
async function getOwnSubmissionLabel(page: PortalNavigationTargetId, id: number, userId: string) {
  if (page === "document-request") {
    const [row] = await db
      .select({ documentType: documentRequestsTable.documentType })
      .from(documentRequestsTable)
      .where(and(eq(documentRequestsTable.id, id), eq(documentRequestsTable.requesterId, userId)));
    return row ? `${row.documentType} request` : null;
  }
  if (page === "complaint") {
    const [row] = await db
      .select({ subject: complaintsTable.subject })
      .from(complaintsTable)
      .where(
        and(
          eq(complaintsTable.id, id),
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
      );
    return row?.subject ?? null;
  }
  if (page === "court-reservation") {
    const [row] = await db
      .select({ date: courtReservationsTable.date })
      .from(courtReservationsTable)
      .where(and(eq(courtReservationsTable.id, id), eq(courtReservationsTable.requesterId, userId)));
    return row ? `Court reservation on ${formatReservationDate(row.date)}` : null;
  }
  const [row] = await db
    .select({ name: businessesTable.name })
    .from(businessesTable)
    .where(and(eq(businessesTable.id, id), eq(businessesTable.ownerId, userId)));
  return row?.name ?? null;
}

// One button per submission, each going to its page with `?view=<id>`, which opens its Submission
// Info dialog (the barangay's reply, attachments, and for a Ready for Pickup online soft copy, the
// document itself). The reference numbers come from getMySubmissions. They're checked against the
// user's own submissions here, so a made-up or someone else's reference number gets no button, and
// the label comes from the database. A longer list (e.g. "show me all my requests") gets none, as
// getMySubmissions tells the model. If it passes more anyway, it's told which ones got no button.
export function buildOpenSubmissionDetailsTool({ userId }: AssistantToolContext) {
  return buttonTool({
    description:
      "Show the user a button for each of their submissions that opens its full details: status, the barangay's " +
      "reply and any attached files. Use the reference numbers getMySubmissions returned (e.g. \"DR-12\").",
    inputSchema: z.object({
      referenceNumbers: z
        .array(z.string())
        .describe(`The submissions' reference numbers from getMySubmissions. The first ${MAX_RECORD_BUTTONS} get a button.`),
    }),
    execute: async ({ referenceNumbers }) => {
      const submissions = [];
      for (const referenceNumber of referenceNumbers.slice(0, MAX_RECORD_BUTTONS)) {
        const match = referenceNumber.trim().toUpperCase().match(/^(DR|CP|CR|CH)-?(\d+)$/);
        if (!match) continue;
        const page = REFERENCE_PREFIX_PAGES[match[1] as keyof typeof REFERENCE_PREFIX_PAGES];
        const id = Number(match[2]);
        const label = await getOwnSubmissionLabel(page, id, userId);
        if (label) submissions.push({ referenceNumber: `${match[1]}-${id}`, label, page, id });
      }

      if (submissions.length === 0) {
        return {
          buttons: [],
          instruction: "None of these reference numbers belongs to one of the user's submissions, so no button was shown. Don't mention one.",
        };
      }

      const withoutButton = referenceNumbers.slice(MAX_RECORD_BUTTONS);
      return {
        buttons: submissions.map(({ referenceNumber, label, page, id }) => ({
          key: `submission-${referenceNumber}`,
          kind: "submission",
          page,
          label: `View ${referenceNumber}: ${label}`,
          href: getSubmissionDialogHref(page, id),
        })),
        instruction: [
          `A button that opens the details is shown below your reply for: ${submissions.map(({ referenceNumber }) => referenceNumber).join(", ")}. Point the user to it; don't write a link.`,
          "If getMySubmissions said it couldn't list all of a kind, still tell the user that too.",
          withoutButton.length > 0 &&
            `Only ${MAX_RECORD_BUTTONS} submissions get a button, so ${withoutButton.join(", ")} didn't. Still include them in your reply, and tell the user they can open those from their pages.`,
        ]
          .filter(Boolean)
          .join(" "),
      };
    },
  });
}
