"use server";

import { openai } from "@ai-sdk/openai";
import { transcribe } from "ai";
import { getAuthRole } from "@/lib/auth";
import { barangayName } from "@/lib/data";

// The client caps recordings at 60s at a low bitrate (~240 KB), well under the 1 MB server action body limit.
const MAX_AUDIO_BYTES = 1024 * 1024;

// Transcribes a voice message recorded in the AI assistant's chat input.
export async function transcribeVoiceInput(formData: FormData): Promise<string> {
  const { userId } = await getAuthRole();
  if (!userId) throw new Error("Unauthorized");

  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) throw new Error("No audio was recorded.");
  if (audio.size > MAX_AUDIO_BYTES) throw new Error("Recording is too long.");

  const { text } = await transcribe({
    model: openai.transcription("gpt-4o-mini-transcribe"),
    audio: new Uint8Array(await audio.arrayBuffer()),
    // No language is set so Filipino and Taglish are auto-detected; the prompt helps with local names.
    providerOptions: {
      openai: { prompt: `A resident asking the ${barangayName} (Carmona, Cavite) portal assistant a question.` },
    },
  });

  return text.trim();
}
