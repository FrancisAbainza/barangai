// The assistant points the user to portal pages with markdown links in its reply, and the chat panel
// shows each one as a button (components/ai-assistant/chat-panel.tsx). Tools give the model ready
// links to copy, made with this, rather than ids it would have to build links from.
export function markdownLink(label: string, href: string): string {
  // A "]" in a title would end the link text early.
  return `[${label.replace(/[[\]]/g, "\\$&")}](${href})`;
}
