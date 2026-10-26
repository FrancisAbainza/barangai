import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getOfficials } from "@/actions/officials";
import { getBarangaySettings } from "@/actions/settings";
import { getLastUserText, getRelevantContext } from "@/lib/ai-assistant/knowledge-base-search";
import { buildSystemPrompt } from "@/lib/ai-assistant/system-prompt";
import { buildAdminTools } from "@/lib/ai-assistant/tools/admin";
import { buildResidentTools } from "@/lib/ai-assistant/tools/resident";
import { getSharedUserLocation } from "@/lib/ai-assistant/tools/get-user-location";
import { getAuthRole } from "@/lib/auth";

// Embedding the query and streaming the completion can take a few seconds combined, and a message
// asking for several things at once takes a model call per tool.
export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const [context, settings, barangayOfficials, skOfficials] = await Promise.all([
    getRelevantContext(getLastUserText(messages)),
    getBarangaySettings(),
    getOfficials("barangay"),
    getOfficials("sk"),
  ]);
  // Residents and admins have separate assistants: their own tools and system prompt.
  const toolContext = { userId, settings, userLocation: getSharedUserLocation(messages) };
  const tools = isAdmin ? buildAdminTools(toolContext) : buildResidentTools(toolContext);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    // Low, because replies repeat exact details from the tools and settings. At OpenAI's default
    // of 1, the model now and then miscopies one, e.g. a business's "83C7+WRC" address as "81C7+WRC".
    temperature: 0.2,
    system: buildSystemPrompt(context, settings, { barangay: barangayOfficials, sk: skOfficials }, isAdmin),
    // Skips a getUserLocation call the browser never answered, e.g. when the user sent another
    // message instead of responding to the permission prompt. OpenAI rejects a call with no result.
    messages: await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    // Each tool call takes a step, and so does the reply. With 3 steps, a message asking for three
    // forms and a business's details got three form buttons and no reply. 8 covers that (3 forms,
    // findBusinesses, openBusinessDetails, the reply) with room to spare. A getUserLocation call ends
    // the stream early, and the browser's follow-up request gets its own steps.
    stopWhen: stepCountIs(8),
    // One tool call per step. With parallel calls, the model sometimes made stray calls alongside
    // the one it needed, e.g. calculateCourtFee or getUserLocation next to a clearance form.
    providerOptions: { openai: { parallelToolCalls: false } },
  });

  return result.toUIMessageStreamResponse();
}
