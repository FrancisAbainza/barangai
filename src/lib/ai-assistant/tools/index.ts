import type { BarangaySettingsValues } from "@/actions/settings";
import type { UserLocation } from "@/lib/ai-assistant/tools/get-user-location";

// What the tools know about the request. The route gets it from the session, the settings and the
// chat history, never from the model. A tool that needs any of it is a `buildXTool(context)`, and
// one that doesn't is exported as the tool itself. The user's role isn't in it: residents and admins
// get separate tools, so no tool checks it.
export type AssistantToolContext = {
  userId: string;
  settings: BarangaySettingsValues;
  userLocation: UserLocation | null;
};

// Residents and admins have separate assistants, each with its own tools and system prompt
// (RESIDENT_PROMPT and ADMIN_PROMPT in ../system-prompt.ts), and the route picks one by the user's
// role. With one set of tools for both, they answered admins as if they were residents: "view my
// complaints" got "Tap the button below to view your complaints", and "what is the status of my
// complaints" found none, since admins don't file complaints.
// - ./resident/index.ts (buildResidentTools) and ./admin/index.ts (buildAdminTools) list each
//   role's tools. A tool that works differently for each role has a version in each folder, e.g.
//   navigateToPage, whose pages and what they're for differ.
// - Tools that work the same for both (news, transparency, the court and the Community Hub) are
//   in the page folders below and in both lists.
//
// There are three kinds of tools:
// - Lookup tools (find*, getMySubmissions, getHandledSubmissions, calculateCourtFee,
//   checkCourtAvailability) return data the model answers from, with an `instruction` for the reply
//   and `buttonShown: false`, without which the reply sometimes pointed to a button that wasn't there.
// - Button tools (navigateToPage, openFormDialog, open*) don't act by themselves. They're built with
//   `buttonTool` (./buttons.ts) and return the buttons the chat panel shows under the reply.
// - getUserLocation, which the browser answers (see its file).
// A tool about one portal page goes in that page's folder, named like the page's route and
// `src/components/<page>/`, usually a lookup tool and the button tool the model calls after it
// (findNews, then openNewsPosts). Tools that span pages stay at the top, or in ./resident and
// ./admin when they're only for one role.
// To add a tool, add it to the list of each role that gets it, and describe when to use it in that
// role's system prompt.
