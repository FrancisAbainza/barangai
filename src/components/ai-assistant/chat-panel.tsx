"use client";

import Link from "next/link";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { ArrowRightIcon, BotIcon, SquarePenIcon, StoreIcon } from "lucide-react";
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
import { VoiceInputButton } from "@/components/ai-assistant/voice-input-button";
import { Button } from "@/components/ui/button";
import { PORTAL_DIALOG_TARGETS, type PortalDialogTargetId } from "@/lib/ai-assistant/portal-dialogs";
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/ai-assistant/portal-navigation";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

type DialogTarget = { dialog: PortalDialogTargetId; href: string };

// Forms the assistant offered to open (openFormDialog tool results), deduplicated.
// The tool's `href` includes the `?prefill=` values the assistant filled in. Results with
// `buttonShown: false` are forms the user's role can't use, so they get no button.
function getDialogTargets(message: UIMessage): DialogTarget[] {
  const targets = new Map<PortalDialogTargetId, string>();
  for (const part of message.parts) {
    if (part.type === "tool-openFormDialog" && part.state === "output-available") {
      const { dialog, href, buttonShown } = part.output as DialogTarget & { buttonShown: boolean };
      if (buttonShown && dialog in PORTAL_DIALOG_TARGETS) targets.set(dialog, href);
    }
  }
  return [...targets].map(([dialog, href]) => ({ dialog, href }));
}

type BusinessTarget = { id: number; name: string; href: string };

// Businesses whose details the assistant offered to open (openBusinessDetails tool results),
// deduplicated. Each `href` opens the business's details on the Community Hub.
function getBusinessTargets(message: UIMessage): BusinessTarget[] {
  const targets = new Map<number, BusinessTarget>();
  for (const part of message.parts) {
    if (part.type === "tool-openBusinessDetails" && part.state === "output-available") {
      const { businesses = [], buttonShown } = part.output as { businesses?: BusinessTarget[]; buttonShown: boolean };
      if (buttonShown) for (const business of businesses) targets.set(business.id, business);
    }
  }
  return [...targets.values()];
}

// Pages the assistant offered to take the user to (navigateToPage tool results), deduplicated.
// Pages already reached by one of the message's form or business buttons are skipped, so the
// model calling two tools for one intent doesn't show two buttons to the same place.
function getNavigationTargets(
  message: UIMessage,
  dialogs: DialogTarget[],
  businesses: BusinessTarget[],
): PortalNavigationTargetId[] {
  const coveredPages = new Set<PortalNavigationTargetId>(dialogs.map(({ dialog }) => PORTAL_DIALOG_TARGETS[dialog].page));
  if (businesses.length > 0) coveredPages.add("community-hub");
  const pages = new Set<PortalNavigationTargetId>();
  for (const part of message.parts) {
    if (part.type === "tool-navigateToPage" && part.state === "output-available") {
      const { page, buttonShown } = part.output as { page: PortalNavigationTargetId; buttonShown: boolean };
      if (buttonShown && page in PORTAL_NAVIGATION_TARGETS && !coveredPages.has(page)) pages.add(page);
    }
  }
  return [...pages];
}

function PromptInputMic() {
  const { textInput } = usePromptInputController();

  return (
    <VoiceInputButton
      onTranscription={(text) => textInput.setInput(textInput.value ? `${textInput.value} ${text}` : text)}
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
              const businessTargets = isStreaming ? [] : getBusinessTargets(message);
              const navigationTargets = isStreaming ? [] : getNavigationTargets(message, dialogTargets, businessTargets);

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    <MessageResponse>{getMessageText(message)}</MessageResponse>
                    {(dialogTargets.length > 0 || businessTargets.length > 0 || navigationTargets.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {dialogTargets.map(({ dialog, href }) => (
                          <Button asChild key={dialog} size="sm">
                            <Link href={href} onClick={onNavigate}>
                              <SquarePenIcon />
                              {PORTAL_DIALOG_TARGETS[dialog].label}
                            </Link>
                          </Button>
                        ))}
                        {businessTargets.map(({ id, name, href }) => (
                          <Button asChild className="max-w-full" key={id} size="sm">
                            <Link href={href} onClick={onNavigate}>
                              <StoreIcon />
                              <span className="truncate">View {name}</span>
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
