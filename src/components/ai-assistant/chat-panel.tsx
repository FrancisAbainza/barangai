"use client";

import Link from "next/link";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { ArrowRightIcon, BotIcon, SquarePenIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
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
import { Button } from "@/components/ui/button";
import { getPortalDialogHref, PORTAL_DIALOG_TARGETS, type PortalDialogTargetId } from "@/lib/portal-dialogs";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/portal-navigation";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

// Forms the assistant offered to open (openFormDialog tool results), deduplicated.
function getDialogTargets(message: UIMessage): PortalDialogTargetId[] {
  const dialogs = new Set<PortalDialogTargetId>();
  for (const part of message.parts) {
    if (part.type === "tool-openFormDialog" && part.state === "output-available") {
      const { dialog } = part.input as { dialog: PortalDialogTargetId };
      if (dialog in PORTAL_DIALOG_TARGETS) dialogs.add(dialog);
    }
  }
  return [...dialogs];
}

// Pages the assistant offered to take the user to (navigateToPage tool results), deduplicated.
// Pages already reached by one of the message's form buttons are skipped, so the model
// calling both tools for one intent doesn't show two buttons to the same place.
function getNavigationTargets(message: UIMessage, dialogs: PortalDialogTargetId[]): PortalNavigationTargetId[] {
  const dialogPages = new Set<PortalNavigationTargetId>(dialogs.map((dialog) => PORTAL_DIALOG_TARGETS[dialog].page));
  const pages = new Set<PortalNavigationTargetId>();
  for (const part of message.parts) {
    if (part.type === "tool-navigateToPage" && part.state === "output-available") {
      const { page } = part.input as { page: PortalNavigationTargetId };
      if (page in PORTAL_NAVIGATION_TARGETS && !dialogPages.has(page)) pages.add(page);
    }
  }
  return [...pages];
}

function PromptInputMic() {
  const { textInput } = usePromptInputController();

  return (
    <SpeechInput
      aria-label="Use microphone"
      onTranscriptionChange={(text) => textInput.setInput(textInput.value ? `${textInput.value} ${text}` : text)}
      size="icon-sm"
    />
  );
}

type ChatPanelProps = Pick<UseChatHelpers<UIMessage>, "messages" | "sendMessage" | "status" | "stop"> & {
  // Called when a navigation or form button is clicked, so the chat widget can get out of the way.
  onNavigate: () => void;
};

export function ChatPanel({ messages, sendMessage, status, stop, onNavigate }: ChatPanelProps) {
  const isResponding = status === "submitted" || status === "streaming";
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
            messages.map((message, index) => {
              // Hold action buttons back until the whole reply has finished streaming.
              const isStreaming = isResponding && index === messages.length - 1;
              const dialogTargets = isStreaming ? [] : getDialogTargets(message);
              const navigationTargets = isStreaming ? [] : getNavigationTargets(message, dialogTargets);

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    <MessageResponse>{getMessageText(message)}</MessageResponse>
                    {(dialogTargets.length > 0 || navigationTargets.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {dialogTargets.map((dialog) => (
                          <Button asChild key={dialog} size="sm">
                            <Link href={getPortalDialogHref(dialog)} onClick={onNavigate}>
                              <SquarePenIcon />
                              {PORTAL_DIALOG_TARGETS[dialog].label}
                            </Link>
                          </Button>
                        ))}
                        {navigationTargets.map((page) => (
                          <Button asChild key={page} size="sm">
                            <Link href={PORTAL_NAVIGATION_TARGETS[page].href} onClick={onNavigate}>
                              Go to {PORTAL_NAVIGATION_TARGETS[page].label}
                              <ArrowRightIcon />
                            </Link>
                          </Button>
                        ))}
                      </div>
                    )}
                  </MessageContent>
                </Message>
              );
            })
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
