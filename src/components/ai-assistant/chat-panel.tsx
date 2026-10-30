"use client";

import { useState } from "react";
import Link from "next/link";
import type { UseChatHelpers } from "@ai-sdk/react";
import { isToolUIPart, type UIMessage } from "ai";
import {
  ArrowRightIcon,
  BotIcon,
  ClipboardListIcon,
  EyeIcon,
  FileTextIcon,
  LightbulbIcon,
  MegaphoneIcon,
  MessageSquareWarningIcon,
  SportShoeIcon,
  SquarePenIcon,
  StoreIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
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

type SuggestedPrompt = { icon: LucideIcon; text: string };

// Examples of what the user can ask, shown before the first message once they ask for them. Each
// one is something the role's system prompt covers, from a plain question to opening a form.
const RESIDENT_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { icon: FileTextIcon, text: "Paano mag-request ng barangay clearance?" },
  { icon: MessageSquareWarningIcon, text: "Gusto kong mag-file ng complaint tungkol sa sirang streetlight." },
  { icon: ClipboardListIcon, text: "Ano na ang status ng mga document request ko?" },
  { icon: SportShoeIcon, text: "Bakante ba ang court sa Sabado ng gabi?" },
  { icon: MegaphoneIcon, text: "May brownout o water interruption ba ngayong linggo?" },
  { icon: StoreIcon, text: "Saan ang pinakamalapit na karinderya?" },
];

const ADMIN_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { icon: ClipboardListIcon, text: "Ano ang kailangan kong asikasuhin ngayon?" },
  { icon: FileTextIcon, text: "Ilan ang pending na document requests?" },
  { icon: MessageSquareWarningIcon, text: "Ilang high-priority complaints ang open?" },
  { icon: MegaphoneIcon, text: "Gusto kong mag-post ng announcement." },
  { icon: EyeIcon, text: "Gusto kong mag-post ng bagong transparency project." },
  { icon: UsersIcon, text: "Saan ko pwedeng i-manage ang mga user account?" },
];

// Rendered in place of the Conversation rather than inside it, since the Conversation sticks to
// the bottom and would scroll the greeting out of view when the examples don't fit.
function ChatEmptyState({ prompts, onSelect }: { prompts: SuggestedPrompt[]; onSelect: (text: string) => void }) {
  // The examples wait behind a button: listed up front, they read as the only things the assistant can answer.
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className="-mx-6 flex-1 overflow-y-auto px-6">
      <div className="flex min-h-full flex-col justify-center gap-3 py-2">
        {showExamples ? (
          <>
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-medium">Example questions</h3>
              <p className="text-sm text-muted-foreground">Tap one to ask it, or type your own question.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {prompts.map(({ icon: Icon, text }) => (
                <Button
                  className="h-auto justify-start py-1.5 text-left font-normal whitespace-normal"
                  key={text}
                  onClick={() => onSelect(text)}
                  variant="outline"
                >
                  <Icon className="text-muted-foreground" />
                  {text}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <BotIcon className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground">Ask a question in English or Filipino to get started.</p>
            </div>
            <Button onClick={() => setShowExamples(true)} size="sm" variant="outline">
              <LightbulbIcon />
              Show example questions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
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
  isAdmin: boolean;
  // Called when one of the reply's buttons is clicked, so the chat widget can get out of the way.
  onNavigate: () => void;
};

export function ChatPanel({ messages, sendMessage, status, stop, isAdmin, onNavigate }: ChatPanelProps) {
  const isResponding = status === "submitted" || status === "streaming";
  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage(message);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {messages.length === 0 ? (
        <ChatEmptyState
          onSelect={(text) => sendMessage({ text })}
          prompts={isAdmin ? ADMIN_SUGGESTED_PROMPTS : RESIDENT_SUGGESTED_PROMPTS}
        />
      ) : (
        <Conversation className="-mx-6 flex-1 px-6">
          <ConversationContent>
            {messages.map((message, index) => {
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
            })}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

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
