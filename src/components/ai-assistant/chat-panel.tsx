"use client";

import Link from "next/link";
import type { UseChatHelpers } from "@ai-sdk/react";
import { isToolUIPart, type UIMessage } from "ai";
import {
  ArrowRightIcon,
  BotIcon,
  EyeIcon,
  FileTextIcon,
  MegaphoneIcon,
  SquarePenIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react";
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
import type { AssistantButton, AssistantButtonKind, ButtonToolOutput } from "@/lib/ai-assistant/tools/buttons";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

// A page button's icon goes after its label ("Go to Complaint →"), the rest before it.
const BUTTON_ICONS: Record<AssistantButtonKind, LucideIcon> = {
  page: ArrowRightIcon,
  form: SquarePenIcon,
  submission: FileTextIcon,
  business: StoreIcon,
  "news-post": MegaphoneIcon,
  project: EyeIcon,
};

// The buttons the message's button tools returned (lib/ai-assistant/tools/buttons.ts), in the order
// they were called. A target asked for twice gets one button. A page button is left out when
// another button already goes to that page, so the model calling two tools for one intent doesn't
// show two buttons to the same place.
function getButtons(message: UIMessage): AssistantButton[] {
  const buttons = new Map<string, AssistantButton>();
  for (const part of message.parts) {
    if (isToolUIPart(part) && part.state === "output-available") {
      const output = part.output as Partial<ButtonToolOutput> | null;
      for (const button of output?.buttons ?? []) buttons.set(button.key, button);
    }
  }
  const coveredPages = new Set([...buttons.values()].filter(({ kind }) => kind !== "page").map(({ page }) => page));
  return [...buttons.values()].filter(({ kind, page }) => kind !== "page" || !coveredPages.has(page));
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
  // Called when one of the reply's buttons is clicked, so the chat widget can get out of the way.
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
              const buttons = isStreaming ? [] : getButtons(message);

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    <MessageResponse>{getMessageText(message)}</MessageResponse>
                    {buttons.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {buttons.map(({ key, kind, label, href }) => {
                          const Icon = BUTTON_ICONS[kind];
                          return (
                            <Button asChild className="max-w-full" key={key} size="sm">
                              <Link href={href} onClick={onNavigate}>
                                {kind !== "page" && <Icon />}
                                <span className="truncate">{label}</span>
                                {kind === "page" && <Icon />}
                              </Link>
                            </Button>
                          );
                        })}
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
