import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getBarangaySettings } from "@/actions/settings";
import { getLastUserText, getRelevantContext } from "@/lib/ai-assistant/knowledge-base-search";
import { buildSystemPrompt } from "@/lib/ai-assistant/system-prompt";
import { buildAssistantTools } from "@/lib/ai-assistant/tools";
import { getAuthRole } from "@/lib/auth";

// Embedding the query and streaming the completion can take a few seconds combined.
export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const [context, settings] = await Promise.all([
    getRelevantContext(getLastUserText(messages)),
    getBarangaySettings(),
  ]);
  const tools = buildAssistantTools(isAdmin, settings);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildSystemPrompt(context, settings, isAdmin),
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    // Room for a lookup (calculateCourtFee), a button tool and the reply, e.g. "how much is
    // 4:30 - 7:30 PM? I'd like to reserve" when the model makes the two calls one after the other.
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
