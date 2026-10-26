import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { businessesTable, complaintsTable, courtReservationsTable, documentRequestsTable } from "@/db/schema";
import type { PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";
import { buttonTool, MAX_RECORD_BUTTONS } from "@/lib/ai-assistant/tools/buttons";
import { getSubmissionButton, parseReferenceNumber } from "@/lib/ai-assistant/tools/submissions";
import { formatReservationDate } from "@/lib/court-reservations";

// The button's label for a submission, or null if it doesn't exist. Unlike a resident, an admin can
// open any resident's submission: each admin page's `?view=<id>` loads it by id.
async function getSubmissionLabel(page: PortalNavigationTargetId, id: number) {
  if (page === "document-request") {
    const [row] = await db
      .select({ documentType: documentRequestsTable.documentType })
      .from(documentRequestsTable)
      .where(eq(documentRequestsTable.id, id));
    return row ? `${row.documentType} request` : null;
  }
  if (page === "complaint") {
    const [row] = await db
      .select({ subject: complaintsTable.subject })
      .from(complaintsTable)
      .where(eq(complaintsTable.id, id));
    return row?.subject ?? null;
  }
  if (page === "court-reservation") {
    const [row] = await db
      .select({ date: courtReservationsTable.date })
      .from(courtReservationsTable)
      .where(eq(courtReservationsTable.id, id));
    return row ? `Court reservation on ${formatReservationDate(row.date)}` : null;
  }
  const [row] = await db.select({ name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.id, id));
  return row?.name ?? null;
}

// One button per submission, each going to its page with `?view=<id>`, which opens it in the admin
// view, with its details and the actions to review it. The reference numbers come from
// getHandledSubmissions or the user. They're checked here, so a made-up one gets no button, and the
// label comes from the database. A longer list gets none, as getHandledSubmissions tells the model.
// If it passes more anyway, it's told which ones got no button.
export const openSubmissionDetailsTool = buttonTool({
  description:
    "Show the user a button for each submission that opens it on its page, with its details, attached files and " +
    "the actions to review it. Use the reference numbers getHandledSubmissions returned or the user gave (e.g. \"DR-12\").",
  inputSchema: z.object({
    referenceNumbers: z
      .array(z.string())
      .describe(`The submissions' reference numbers. The first ${MAX_RECORD_BUTTONS} get a button.`),
  }),
  execute: async ({ referenceNumbers }) => {
    const submissions = [];
    for (const referenceNumber of referenceNumbers.slice(0, MAX_RECORD_BUTTONS)) {
      const reference = parseReferenceNumber(referenceNumber);
      if (!reference) continue;
      const label = await getSubmissionLabel(reference.page, reference.id);
      if (label) submissions.push({ ...reference, label });
    }

    if (submissions.length === 0) {
      return {
        buttons: [],
        instruction: "None of these reference numbers belongs to a submission, so no button was shown. Don't mention one.",
      };
    }

    const withoutButton = referenceNumbers.slice(MAX_RECORD_BUTTONS);
    return {
      buttons: submissions.map(getSubmissionButton),
      instruction: [
        `A button that opens the details is shown below your reply for: ${submissions.map(({ referenceNumber }) => referenceNumber).join(", ")}. Point the user to it; don't write a link.`,
        "If getHandledSubmissions said it couldn't list all of a kind, still tell the user that too.",
        withoutButton.length > 0 &&
          `Only ${MAX_RECORD_BUTTONS} submissions get a button, so ${withoutButton.join(", ")} didn't. Still include them in your reply, and tell the user they can open those from their pages.`,
      ]
        .filter(Boolean)
        .join(" "),
    };
  },
});
