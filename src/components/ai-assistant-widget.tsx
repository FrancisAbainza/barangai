"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { BotIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "@/components/ai-assistant/chat-panel";
import { KnowledgeBaseManager } from "@/components/knowledge-base-manager";
import { getCurrentLocation } from "@/lib/geolocation";
import { isAdminRole } from "@/lib/roles";

// Some browsers never answer when the permission prompt is closed without a choice, and a GPS fix
// can take a while. Past this, the assistant is told the location isn't available and replies anyway.
const LOCATION_TIMEOUT_MS = 30_000;

function getLocationForAssistant() {
  return Promise.race([
    getCurrentLocation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timed out waiting for the user's location.")), LOCATION_TIMEOUT_MS),
    ),
  ]);
}

// True once the browser has answered the getUserLocation call that ended the last response,
// so the chat goes back to the server and the assistant carries on with the location.
function hasAnsweredLocationRequest({ messages }: { messages: UIMessage[] }) {
  const parts = messages.at(-1)?.parts ?? [];
  const lastStep = parts.slice(parts.findLastIndex((part) => part.type === "step-start") + 1);
  return (
    lastAssistantMessageIsCompleteWithToolCalls({ messages }) &&
    lastStep.some((part) => part.type === "tool-getUserLocation")
  );
}

export function AiAssistantWidget() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  // Controlled (rather than left to DialogTrigger) so clicking a navigation or form
  // button in the chat can close the widget and let the user see the page.
  const [open, setOpen] = useState(false);

  // Lifted above the Dialog (which unmounts its content on close) so chat
  // history survives closing/reopening — it only resets on refresh/navigation.
  const { messages, sendMessage, status, stop, addToolOutput } = useChat({
    onError: (error) => toast.error(error.message || "Something went wrong."),
    // getUserLocation is answered here rather than on the server (see lib/ai-assistant/tools/get-user-location.ts).
    // Not awaited: the stream waits for onToolCall, and addToolOutput waits for the stream.
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName !== "getUserLocation") return;
      const { toolCallId } = toolCall;
      getLocationForAssistant().then(
        (location) => addToolOutput({ tool: "getUserLocation", toolCallId, output: location }),
        (error: Error) =>
          addToolOutput({ tool: "getUserLocation", toolCallId, state: "output-error", errorText: error.message }),
      );
    },
    sendAutomaticallyWhen: hasAnsweredLocationRequest,
  });

  const chatPanel = (
    <ChatPanel
      messages={messages}
      sendMessage={sendMessage}
      status={status}
      stop={stop}
      onNavigate={() => setOpen(false)}
    />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          aria-label="Open AI Assistant"
          className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg"
          size="icon-lg"
        >
          <BotIcon className="size-7" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[70vh] max-h-160 flex-col gap-4 sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary">
            <BotIcon className="size-5 text-primary-foreground" />
          </div>
          <div className="pr-8">
            <DialogTitle>AI Assistant</DialogTitle>
            <DialogDescription>
              Ask about document requests, complaints, court reservations, and more.
            </DialogDescription>
          </div>
        </DialogHeader>

        {isAdmin ? (
          <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="chat">
            <TabsList className="w-full">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
            </TabsList>
            <TabsContent className="flex min-h-0 flex-1 flex-col" value="chat">
              {chatPanel}
            </TabsContent>
            <TabsContent className="flex min-h-0 flex-1 flex-col" value="knowledge-base">
              <KnowledgeBaseManager />
            </TabsContent>
          </Tabs>
        ) : (
          chatPanel
        )}
      </DialogContent>
    </Dialog>
  );
}
