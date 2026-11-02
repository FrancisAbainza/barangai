import type { BarangaySettingsValues } from "@/actions/settings";
import type { UserLocation } from "@/lib/ai-assistant/tools/get-user-location";

// What the tools know about the request. The route gets it from the session, the settings and the
// chat history, never from the model. A tool that needs any of it is a `buildXTool(context)`, and
// one that doesn't is exported as the tool itself. Whether the user is a resident or an admin isn't
// in it: they get separate tools, so no tool checks it.
export type AssistantToolContext = {
  userId: string;
  // Among admins, only super admins see every admin's audit logs (findAuditLogs).
  isSuperAdmin: boolean;
  settings: BarangaySettingsValues;
  userLocation: UserLocation | null;
};

// Residents and admins have separate tool lists, and the route picks one by the user's role:
// ./resident/index.ts (buildResidentTools) and ./admin/index.ts (buildAdminTools). With one set of
// tools for both, "what is the status of my complaints" found none for admins, since admins don't
// file complaints. A tool only one role has is in that role's folder. Tools both roles share are
// in the folder of the portal page they're about, named like its route and `src/components/<page>/`
// (news, transparency, the court and the Community Hub), or at the top when they span pages.
//
// Each tool's description says what it's for and the questions it answers, so the system prompt
// doesn't list the tools. Adding a tool means writing its file and adding it to each role's list.
// - Lookup tools (find*, getMySubmissions, getHandledSubmissions, getSubmissionOverview, getAnalytics,
//   findAuditLogs, calculateCourtFee, checkCourtAvailability) return data the model answers from,
//   with an `instruction` for the reply. Records come with a ready markdown `link` (./links.ts),
//   which the chat panel shows as a button when the model puts it in its reply.
// - getFormLink returns the link that opens a form, with what the user said filled in.
// - getUserLocation, which the browser answers (see its file).
