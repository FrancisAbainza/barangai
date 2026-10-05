import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getAuthRole } from "@/lib/auth";
import {
  buildAssistantTools,
  buildSystemPrompt,
  getLastUserText,
  getRelevantContext,
} from "@/lib/ai-assistant";

// Embedding the query and streaming the completion can take a few seconds combined.
export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const context = await getRelevantContext(getLastUserText(messages));
  const tools = buildAssistantTools({ isAdmin });

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildSystemPrompt(context),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    // One step for the tool call, one for the short reply pointing at the navigation button.
    stopWhen: stepCountIs(2),
  });

  return result.toUIMessageStreamResponse();
}
