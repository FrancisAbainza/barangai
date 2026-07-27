"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { BotIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { KnowledgeBaseManager } from "@/components/knowledge-base-manager";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/portal-navigation";
import { isAdminRole } from "@/lib/roles";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

type PendingNavigation = { toolCallId: string; page: PortalNavigationTargetId; reason: string };

// Only the most recent assistant message can have a navigation call awaiting confirmation.
function findPendingNavigation(messages: UIMessage[]): PendingNavigation | null {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") return null;

  for (const part of lastMessage.parts) {
    if (part.type === "tool-navigateToPage" && part.state === "input-available") {
      const input = part.input as { page: PortalNavigationTargetId; reason: string };
      return { toolCallId: part.toolCallId, page: input.page, reason: input.reason };
    }
  }
  return null;
}

function PromptInputMic() {
  const { textInput } = usePromptInputController();

  return (
    <SpeechInput
      aria-label="Use microphone"
      onTranscriptionChange={(text) =>
        textInput.setInput(
          textInput.value ? `${textInput.value} ${text}` : text
        )
      }
      size="icon-sm"
    />
  );
}

type ChatPanelProps = Pick<UseChatHelpers<UIMessage>, "messages" | "sendMessage" | "status" | "stop">;

function ChatPanel({ messages, sendMessage, status, stop }: ChatPanelProps) {
  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage(message);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Conversation className="-mx-6 flex-1 px-6">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Ask a question to get started."
              icon={<BotIcon className="size-8" />}
              title="How can I help you today?"
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  <MessageResponse>{getMessageText(message)}</MessageResponse>
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInputProvider>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask about barangay services..." />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputMic />
            </PromptInputTools>
            <PromptInputSubmit onStop={stop} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
}

export function AiAssistantWidget() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);
  const router = useRouter();

  // Controlled (rather than left to DialogTrigger) so a confirmed navigation can
  // close the widget and let the resident actually see the page it sent them to.
  const [open, setOpen] = useState(false);

  // Guards against double-resolving the same tool call — e.g. Cancel's onClick
  // firing alongside the AlertDialog's own onOpenChange(false) from the same click.
  const resolvedToolCallIds = useRef(new Set<string>());

  // Lifted above the Dialog (which unmounts its content on close) so chat
  // history survives closing/reopening — it only resets on refresh/navigation.
  const { messages, sendMessage, status, stop, addToolOutput } = useChat({
    onError: (error) => toast.error(error.message || "Something went wrong."),
    // Once the navigation tool call has a result, let the assistant send a
    // follow-up reply (or pick up a "cancelled" result) without another prompt.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const pendingNavigation = findPendingNavigation(messages);

  const resolveNavigation = (navigation: PendingNavigation, approved: boolean) => {
    if (resolvedToolCallIds.current.has(navigation.toolCallId)) return;
    resolvedToolCallIds.current.add(navigation.toolCallId);

    addToolOutput({
      tool: "navigateToPage",
      toolCallId: navigation.toolCallId,
      output: approved
        ? { navigated: true, page: navigation.page }
        : { navigated: false, reason: "The resident declined the confirmation dialog." },
    });

    if (approved) {
      setOpen(false);
      router.push(PORTAL_NAVIGATION_TARGETS[navigation.page].href);
    }
  };

  return (
    <>
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
                Ask about document requests, complaints, court reservations, and
                more.
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
                <ChatPanel messages={messages} sendMessage={sendMessage} status={status} stop={stop} />
              </TabsContent>
              <TabsContent className="flex min-h-0 flex-1 flex-col" value="knowledge-base">
                <KnowledgeBaseManager />
              </TabsContent>
            </Tabs>
          ) : (
            <ChatPanel messages={messages} sendMessage={sendMessage} status={status} stop={stop} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingNavigation != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && pendingNavigation) resolveNavigation(pendingNavigation, false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingNavigation ? `Go to ${PORTAL_NAVIGATION_TARGETS[pendingNavigation.page].label}?` : "Navigate?"}
            </AlertDialogTitle>
            <AlertDialogDescription>{pendingNavigation?.reason}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => pendingNavigation && resolveNavigation(pendingNavigation, false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingNavigation && resolveNavigation(pendingNavigation, true)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
