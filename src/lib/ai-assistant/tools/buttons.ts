import { tool, type FlexibleSchema } from "ai";
import type { PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";

// What a button opens. The chat panel picks the button's icon from it, and leaves out a "page"
// button ("Go to Complaint") when another button in the same reply goes to that page, so the model
// calling navigateToPage and openFormDialog for one request doesn't show two buttons to one place.
export type AssistantButtonKind = "page" | "form" | "submission" | "business" | "news-post" | "project";

export type AssistantButton = {
  // Unique per target, e.g. "business-4", so a target the model asks for twice gets one button.
  key: string;
  kind: AssistantButtonKind;
  // The portal page the button goes to.
  page: PortalNavigationTargetId;
  label: string;
  href: string;
};

// What every button tool returns. The chat panel (components/ai-assistant/chat-panel.tsx) renders
// `buttons` under the reply once it has finished streaming, and none when the list is empty, e.g.
// for a form the user's role can't use. The model only gets `instruction`, which says what to tell
// the user. Given the hrefs, it wrote links like "[View Details](#)" instead of pointing to the buttons.
export type ButtonToolOutput = { buttons: AssistantButton[]; instruction: string };

// For the tools that show a button per record (a submission, a business, a post...), so the chat
// doesn't fill up with them.
export const MAX_RECORD_BUTTONS = 3;

// A tool that doesn't act by itself but shows buttons the user taps. Every button tool is built with
// this, so they all return a ButtonToolOutput and show the model only its instruction, and the chat
// panel renders a new one's buttons with no change.
export function buttonTool<INPUT>({
  description,
  inputSchema,
  execute,
}: {
  description: string;
  inputSchema: FlexibleSchema<INPUT>;
  execute: (input: INPUT) => Promise<ButtonToolOutput>;
}) {
  return tool({
    description,
    inputSchema,
    execute,
    toModelOutput: ({ output }) => ({ type: "text", value: output.instruction }),
  });
}
