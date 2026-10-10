"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MicIcon, SquareIcon } from "lucide-react";
import { toast } from "sonner";
import { transcribeVoiceInput } from "@/actions/ai-assistant";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const MAX_RECORDING_MS = 60_000;
// Plenty for speech, and keeps a full-length recording around 240 KB.
const AUDIO_BITS_PER_SECOND = 32_000;
// Safari can't record webm, so fall back to whatever the browser supports.
const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

const subscribeNoop = () => () => {};
const getIsSupported = () => "MediaRecorder" in window && !!navigator.mediaDevices;

type VoiceInputButtonProps = {
  onTranscription: (text: string) => void;
  className?: string;
};

// Records a voice message and transcribes it on the server (OpenAI). Unlike the browser's
// Web Speech API, this works the same in every browser and doesn't repeat words on Android.
export function VoiceInputButton({ onTranscription, className }: VoiceInputButtonProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The recorder's stop handler outlives the render that started it, so read the latest callback.
  const onTranscriptionRef = useRef(onTranscription);
  useEffect(() => {
    onTranscriptionRef.current = onTranscription;
  });

  // False during SSR, so the button renders disabled until hydration confirms support.
  const isSupported = useSyncExternalStore(subscribeNoop, getIsSupported, () => false);

  // Release the microphone if the chat closes mid-recording, without transcribing.
  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
        for (const track of recorder.stream.getTracks()) track.stop();
      }
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    },
    []
  );

  const stopRecording = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const startRecording = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Microphone access was blocked. Allow it in your browser settings to use voice input.");
      return;
    }

    const mimeType = PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      for (const track of stream.getTracks()) track.stop();
      recorderRef.current = null;

      const audio = new Blob(chunks, { type: recorder.mimeType });
      if (audio.size === 0) {
        setStatus("idle");
        return;
      }

      setStatus("transcribing");
      try {
        const formData = new FormData();
        formData.append("audio", audio);
        const text = await transcribeVoiceInput(formData);
        if (text) onTranscriptionRef.current(text);
        else toast.info("No speech was detected. Try again.");
      } catch {
        toast.error("Couldn't transcribe your voice message. Please try again.");
      } finally {
        setStatus("idle");
      }
    };

    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
    stopTimerRef.current = setTimeout(() => {
      toast.info("Voice messages are limited to 60 seconds.");
      stopRecording();
    }, MAX_RECORDING_MS);
  };

  const isRecording = status === "recording";

  return (
    <div className="relative inline-flex items-center justify-center">
      {isRecording &&
        [0, 1, 2].map((index) => (
          <div
            className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
            key={index}
            style={{ animationDelay: `${index * 0.3}s`, animationDuration: "2s" }}
          />
        ))}
      <Button
        aria-label={isRecording ? "Stop recording" : "Use microphone"}
        className={cn(
          "relative z-10 rounded-full transition-all duration-300",
          isRecording
            ? "bg-destructive text-white hover:bg-destructive/80 hover:text-white"
            : "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
          className
        )}
        disabled={!isSupported || status === "transcribing"}
        onClick={isRecording ? stopRecording : startRecording}
        size="icon-sm"
        type="button"
      >
        {status === "transcribing" ? <Spinner /> : isRecording ? <SquareIcon className="size-4" /> : <MicIcon className="size-4" />}
      </Button>
    </div>
  );
}
