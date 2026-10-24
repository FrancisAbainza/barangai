import { tool, type UIMessage } from "ai";
import z from "zod";

const userLocationSchema = z.object({ lat: z.number(), lng: z.number() });

export type UserLocation = z.infer<typeof userLocationSchema>;

// The only tool the browser runs. It has no `execute`, so the stream stops at the call, and the
// chat widget (components/ai-assistant-widget.tsx) answers it with the device's location and
// sends the conversation back. findBusinesses then gets the location from the chat history
// (getSharedUserLocation), not from the model.
export const getUserLocationTool = tool({
  description:
    "Get the user's current location from their device, so findBusinesses can list businesses nearest first. " +
    "Call it on its own, and only when the user asks what's nearest or close to them and hasn't shared their " +
    "location in this conversation yet. Their browser may ask them for permission.",
  inputSchema: z.object({}),
  // The model only needs to know it worked, so the coordinates aren't sent to OpenAI.
  toModelOutput: () => ({
    type: "text",
    value: "The user shared their location. Call findBusinesses, which now lists businesses nearest first.",
  }),
});

// The latest location the user shared in this conversation, if any.
export function getSharedUserLocation(messages: UIMessage[]): UserLocation | null {
  for (const part of messages.flatMap((message) => message.parts).reverse()) {
    if (part.type === "tool-getUserLocation" && part.state === "output-available") {
      const parsed = userLocationSchema.safeParse(part.output);
      return parsed.success ? parsed.data : null;
    }
  }
  return null;
}
