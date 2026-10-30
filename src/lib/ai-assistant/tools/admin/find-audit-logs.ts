import { clerkClient } from "@clerk/nextjs/server";
import { tool } from "ai";
import { and, count, desc, inArray } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { auditLogsTable } from "@/db/schema";
import type { AssistantToolContext } from "@/lib/ai-assistant/tools";
import { getAuditActors, getAuditLogsWhere } from "@/lib/audit";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS, type AuditAction, type AuditEntityType } from "@/lib/audit-logs";
import { roleLabel } from "@/lib/roles";
import { formatPhilippineDate, getPhilippineTime, parseDateValue, toDateValue } from "@/lib/utils";

// A few days of a barangay's changes, without filling the model's context.
const MAX_ENTRIES = 30;
// A changed field's value can be long, e.g. the whole mission or vision.
const MAX_VALUE_LENGTH = 200;

const categories = Object.keys(AUDIT_ENTITY_LABELS) as AuditEntityType[];
const actions = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];

function toFilterName(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

// The model copied the category into search too ("barangay settings" with category
// barangay-settings), even when told not to, and no entry's details name their category ("Updated
// Court Day Rate"). So a search that only names a category or an action is dropped.
const FILTER_NAMES = new Set(
  [...categories, ...Object.values(AUDIT_ENTITY_LABELS), ...actions, ...Object.values(AUDIT_ACTION_LABELS)].map(
    toFilterName,
  ),
);

// False for anything that isn't a real "YYYY-MM-DD" date (e.g. "2026-02-30", which parseDateValue
// rolls over to March).
function isDateValue(value: string) {
  return toDateValue(parseDateValue(value)) === value;
}

// e.g. "Friday 2026-10-30 (today), Thursday 2026-10-29 (yesterday), Wednesday 2026-10-28, …", like
// checkCourtAvailability's coming week, so the model looks up "kahapon" or "noong Lunes" instead of
// counting days.
function describePastWeek(today: string): string {
  return Array.from({ length: 7 }, (_, i) => {
    const date = parseDateValue(today);
    date.setDate(date.getDate() - i);
    const label = i === 0 ? " (today)" : i === 1 ? " (yesterday)" : "";
    return `${date.toLocaleDateString("en-US", { weekday: "long" })} ${toDateValue(date)}${label}`;
  }).join(", ");
}

// "2026-10-30" → "October 30, 2026"
function formatDateValue(value: string) {
  return parseDateValue(value).toLocaleDateString("en-US", { dateStyle: "long" });
}

function truncate(value: string | null) {
  return value && value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;
}

// The Audit Logs page for the assistant: who changed what in the portal, and when. Super admins
// search every admin's entries, like on the page. Other admins only their own, like the Audit Logs
// tab on their profile, since that's all getAuditLogs lets them read. It uses the page's filters
// (getAuditLogsWhere) plus the admin who did it, and counts the matches itself, because the model
// can't be trusted to count entries. Like findNews, it shows no button. It's built per request for
// today's date, like checkCourtAvailability: the model has no clock.
// The model fills in every input, even ones it's told to leave out: without "all", "ano ang mga
// binago ngayong araw?" was searched with category "user" and action "updated", and found nothing.
// So the filters have the page's "all", and an empty search or admin counts as none. Asked about
// "this week", it searched only today, or from today back to Monday, so the description gives the
// week's dates and a reversed range is swapped.
export function buildFindAuditLogsTool({ userId, isSuperAdmin }: AssistantToolContext) {
  const { date: today, day } = getPhilippineTime();
  const weekStart = parseDateValue(today);
  weekStart.setDate(weekStart.getDate() - day);
  const allEntriesPlace = isSuperAdmin ? "the Audit Logs page" : "the Audit Logs tab on their profile";

  const filtersSchema = z.object({
    search: z
      .string()
      .optional()
      .describe(
        "Empty unless the user asked about a specific record or person. Then words in the entries' details, " +
          "which are in English and name the record: a reference number (\"DR-12\"), a title, a person's name, or " +
          "a new status (\"to Rejected\", \"to Resolved\"). It also matches the name of the admin who did it. Never " +
          'a kind of record or action, like "barangay settings", "news" or "deleted": category and action are for those.',
      ),
    category: z
      .enum(["all", ...categories])
      .optional()
      .describe(
        '"all" unless the user asked about one kind of record. The kinds: ' +
          categories.map((category) => `${category} (${AUDIT_ENTITY_LABELS[category]})`).join(", ") +
          ". official is the barangay and SK officials, and user is user accounts.",
      ),
    action: z
      .enum(["all", ...actions])
      .optional()
      .describe(
        '"all" unless the user asked about one kind of action. The kinds: ' +
          actions.map((action) => `${action} (${AUDIT_ACTION_LABELS[action]})`).join(", ") +
          ". Reviewing a resident's submission, e.g. rejecting or resolving it, is status-changed, and posting " +
          "or adding something is created.",
      ),
    dateFrom: z.string().optional().describe('The first day to search, as "YYYY-MM-DD", or empty for no limit.'),
    dateTo: z.string().optional().describe('The last day to search, as "YYYY-MM-DD", or empty for no limit.'),
  });
  // Only super admins narrow it down by admin. Given these with "Empty" in their descriptions, the
  // other admins' tool still got "admin" as the admin for "ano ang mga binago ko?", so it has none.
  // Their entries are the user's own whatever the input (`actorId` below).
  const superAdminSchema = filtersSchema.extend({
    admin: z
      .string()
      .optional()
      .describe("Empty unless the user named the admin who did it. Then that admin's name or email."),
    onlyMine: z
      .boolean()
      .optional()
      .describe('true only when the user asks about their own changes ("ano ang mga binago ko?").'),
  });

  return tool({
    description:
      `Today is ${parseDateValue(today).toLocaleDateString("en-US", { dateStyle: "full" })} in the Philippines. ` +
      "Search the audit logs, the record of the changes admins make in the portal: changing the status of residents' " +
      "submissions (e.g. from Pending to Rejected), editing or deleting them, posting news and transparency projects, " +
      "changing Barangay Settings and the officials, managing user accounts, and uploading the AI knowledge base. " +
      "Each entry has who did it, when, and each changed field's value before and after. " +
      (isSuperAdmin
        ? "Every admin's changes are here. "
        : "Only the user's own changes are here, like on the Audit Logs tab on their profile: other admins' changes are only for super admins. ") +
      'Use it for questions like "sino ang nag-reject ng DR-12?", "sino ang nag-post ng announcement tungkol sa ' +
      'brownout?", "ano ang mga binago ko kahapon?", "who changed the clearance fees?" or "ilang complaint ang ' +
      'na-resolve ngayong linggo?". ' +
      `The past week is ${describePastWeek(today)}. For "ngayon", "kahapon" or a day of the week, use its date from this list. ` +
      `This week ("ngayong linggo") is ${toDateValue(weekStart)} to ${today}.`,
    // The other admins' schema is the super admins' without its two optional inputs.
    inputSchema: (isSuperAdmin ? superAdminSchema : filtersSchema) as typeof superAdminSchema,
    execute: async ({ search, admin, onlyMine, category, action, ...dates }) => {
      if ((dates.dateFrom && !isDateValue(dates.dateFrom)) || (dates.dateTo && !isDateValue(dates.dateTo))) {
        return { error: 'Send dateFrom and dateTo as "YYYY-MM-DD", or leave them empty.' };
      }
      const [dateFrom, dateTo] =
        dates.dateFrom && dates.dateTo && dates.dateFrom > dates.dateTo
          ? [dates.dateTo, dates.dateFrom]
          : [dates.dateFrom, dates.dateTo];

      // With onlyMine, it once sent "super admin" as the admin too.
      const adminQuery = isSuperAdmin && !onlyMine ? admin?.trim() : undefined;
      let actorIds: string[] | undefined;
      if (adminQuery) {
        const client = await clerkClient();
        const { data: users } = await client.users.getUserList({ query: adminQuery, limit: 100 });
        if (users.length === 0) {
          return { error: `No admin's name or email matches "${adminQuery}". Tell the user you couldn't find that admin.` };
        }
        actorIds = users.map((user) => user.id);
      }

      const searchText = search?.trim() && !FILTER_NAMES.has(toFilterName(search)) ? search.trim() : undefined;
      const getWhere = async (search?: string) =>
        and(
          await getAuditLogsWhere({
            search,
            entityType: category,
            action,
            dateFrom,
            dateTo,
            actorId: isSuperAdmin && !onlyMine ? undefined : userId,
          }),
          actorIds && inArray(auditLogsTable.actorId, actorIds),
        );
      const countEntries = async (where: Awaited<ReturnType<typeof getWhere>>) => {
        const [{ total }] = await db.select({ total: count() }).from(auditLogsTable).where(where);
        return total;
      };

      // A search has to match an entry's details word for word, so "event tungkol sa kalinisan"
      // missed the "PATIMPALAK SA PINAKAMALINIS NA LUGAR" event, and "clearance fees" would miss
      // "Clearance Fee (Clearance for Local Employment)". Told to search again without it, the model did about half
      // the time. So when a search finds nothing, the entries matching the other inputs are listed
      // instead, and the model picks the ones that fit, like findNews.
      let where = await getWhere(searchText);
      let total = await countEntries(where);
      const searchMissed = total === 0 && searchText !== undefined;
      if (searchMissed) {
        where = await getWhere();
        total = await countEntries(where);
      }

      const [logs, byActor] = await Promise.all([
        db
          .select()
          .from(auditLogsTable)
          .where(where)
          .orderBy(desc(auditLogsTable.createdAt), desc(auditLogsTable.id))
          .limit(MAX_ENTRIES),
        // Other admins only have their own changes, so they get no breakdown.
        isSuperAdmin
          ? db
              .select({ actorId: auditLogsTable.actorId, count: count() })
              .from(auditLogsTable)
              .where(where)
              .groupBy(auditLogsTable.actorId)
              .orderBy(desc(count()))
          : [],
      ]);

      const actors = await getAuditActors([...logs, ...byActor].map((row) => row.actorId));
      const actorName = (actorId: string) => actors.get(actorId)!.actorName;

      // As a regular admin, "ano ang ginawa ni Francis?" found none of the user's own and was told
      // "I couldn't find anything Francis did", as if Francis had done nothing. Whether a name is an
      // admin's isn't known, so the reply always says whose changes these are. The dates are filled in
      // by code: told to give them "if any", the model once said it searched "from the start of the
      // year" when it had sent none.
      const searchedDates =
        dateFrom || dateTo
          ? ` from ${dateFrom ? formatDateValue(dateFrom) : "the start"} to ${dateTo ? formatDateValue(dateTo) : "today"}`
          : "";
      const noMatchReply = isSuperAdmin
        ? `tell the user you couldn't find that in the audit logs${searchedDates}, without listing other entries.`
        : `tell the user you couldn't find that among their own changes${searchedDates}, the only ones they can see, since other admins' changes are only for super admins. Don't list other entries.`;

      // The total is filled in by code, like getSubmissionOverview's counts.
      const instructions = [
        isSuperAdmin
          ? "These are the matching audit log entries, newest first: changes admins made in the portal."
          : "These are the user's own matching audit log entries, newest first: changes they made in the portal. Say they did them (\"You changed DR-12 to Rejected\"). Other admins' changes are only for super admins, so if the user asked about those, tell them that instead.",
        "Answer only from these entries, and only about the ones that fit what the user asked. details describes what was done. changes has each changed field's value before and after: a null before means the record was just created, and a null after that it was deleted. when is in Philippine time.",
        searchMissed
          ? `No entry's details contain "${searchText}" word for word, so these are the entries that match the other inputs instead. Answer only about the ones that clearly fit the user's question: when they gave a reference number or a name, only an entry with it fits. total${isSuperAdmin ? " and byAdmin count" : " counts"} all of these, not only the ones that fit, so don't answer how many from it. If none fits, ${noMatchReply}`
          : `There are ${total} matching entries in all: answer how many from that, never by counting the entries.` +
            (isSuperAdmin ? " byAdmin has how many of them each admin did, for who did the most or how many one admin did." : ""),
        total === 0 && `Since none match, ${noMatchReply}`,
        total > logs.length &&
          `Only the ${logs.length} most recent are listed. Whenever your answer lists them, or what the user asked about may be in an older one, tell them ${allEntriesPlace} has them all, or offer to narrow it down by date or category.`,
        isSuperAdmin
          ? "This result shows no button, so don't mention one unless you call navigateToPage. If the user wants to see or browse the entries themselves, call navigateToPage for audit-logs."
          : `This result shows no button, so don't mention one. If the user wants to see or browse the entries themselves, tell them they're on ${allEntriesPlace}.`,
      ];

      return {
        total,
        ...(isSuperAdmin && {
          byAdmin: byActor.map((row) => ({ admin: actorName(row.actorId), count: row.count })),
        }),
        entries: logs.map((log) => ({
          when: formatPhilippineDate(log.createdAt, true),
          doneBy: `${actorName(log.actorId)} (${roleLabel(log.actorRole)})`,
          category: AUDIT_ENTITY_LABELS[log.entityType],
          action: AUDIT_ACTION_LABELS[log.action],
          details: log.summary,
          ...(log.changes.length > 0 && {
            changes: log.changes.map((change) => ({
              field: change.label,
              before: truncate(change.from),
              after: truncate(change.to),
            })),
          }),
        })),
        buttonShown: false,
        instruction: instructions.filter(Boolean).join(" "),
      };
    },
  });
}
