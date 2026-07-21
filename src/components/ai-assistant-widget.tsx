"use client";

import { useUser } from "@clerk/nextjs";
import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import { BotIcon } from "lucide-react";
import { toast } from "sonner";
import type { UIMessage } from "ai";
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
import { isAdminRole } from "@/lib/roles";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
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

  // Lifted above the Dialog (which unmounts its content on close) so chat
  // history survives closing/reopening — it only resets on refresh/navigation.
  const { messages, sendMessage, status, stop } = useChat({
    onError: (error) => toast.error(error.message || "Something went wrong."),
  });

  return (
    <Dialog>
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
  );
}
