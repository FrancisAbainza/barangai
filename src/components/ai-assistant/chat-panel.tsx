"use client";

import { useState, type ReactNode } from "react";
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
import { MotionConfig, motion, stagger, type Variants } from "motion/react";
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
import { DIALOG_SEARCH_PARAM } from "@/lib/ai-assistant/portal-dialogs";
import { isPortalHref, PORTAL_NAVIGATION_TARGETS } from "@/lib/ai-assistant/portal-navigation";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

// The reply's links to portal pages (lib/ai-assistant/tools/links.ts) show as buttons: to a form, to
// one record on a page (a submission, business, post or project), or to the page itself, whose icon
// goes after its label ("Document Request →"). Clicking one closes the chat so the user sees the
// page. The model sometimes puts a made-up website address in front ("https://barangaymaduya.com/portal/news"),
// so that's dropped. Any other link, or one still streaming in, stays plain text: the assistant
// only links to the portal, so anything else is made up.
function AssistantLink({ href = "", children, onNavigate }: { href?: string; children?: ReactNode; onNavigate: () => void }) {
  const url = URL.canParse(href, "http://localhost") ? new URL(href, "http://localhost") : null;
  const path = url ? url.pathname + url.search : "";
  if (url && isPortalHref(path)) {
    const isPage = Object.values(PORTAL_NAVIGATION_TARGETS).some((target) => target.href === path);
    const Icon = url.searchParams.has(DIALOG_SEARCH_PARAM) ? SquarePenIcon : isPage ? ArrowRightIcon : EyeIcon;
    return (
      <Button asChild className="my-0.5 mr-1 max-w-full align-middle" size="sm">
        <Link href={path} onClick={onNavigate}>
          {!isPage && <Icon />}
          <span className="truncate">{children}</span>
          {isPage && <Icon />}
        </Link>
      </Button>
    );
  }
  return <span>{children}</span>;
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

// Each dot bobs a beat after the one before it.
const typingDotsVariants: Variants = { animate: { transition: { delayChildren: stagger(0.1) } } };
const typingDotVariants: Variants = {
  animate: { y: [0, -4, 0], transition: { duration: 1, ease: "easeInOut", repeat: Infinity } },
};

// Devices that ask for reduced motion get still dots.
function TypingIndicator() {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        animate="animate"
        className="flex w-fit items-center gap-1 rounded-full bg-muted px-4 py-3"
        role="status"
        variants={typingDotsVariants}
      >
        <span className="sr-only">The assistant is typing</span>
        {[0, 1, 2].map((dot) => (
          <motion.span className="size-2 rounded-full bg-muted-foreground" key={dot} variants={typingDotVariants} />
        ))}
      </motion.div>
    </MotionConfig>
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

  // The typing indicator shows while the reply has no text coming in: before its first word and
  // while a tool runs between steps. The stream also ends at a getUserLocation call and resumes once
  // the browser answers it (ai-assistant-widget.tsx), so it shows during that wait too.
  const lastMessage = messages.at(-1);
  const lastPart = lastMessage?.role === "assistant" ? lastMessage.parts.at(-1) : undefined;
  const isGettingLocation =
    lastPart?.type === "tool-getUserLocation" && isToolUIPart(lastPart) && lastPart.state === "input-available";
  const isTyping = (isResponding && lastPart?.type !== "text") || isGettingLocation;

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
            {messages.map((message) => {
              const text = getMessageText(message);
              // A reply that has only called tools so far has nothing to show. The typing indicator stands in for it.
              if (!text) return null;

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    <MessageResponse
                      components={{
                        a: ({ href, children }) => (
                          <AssistantLink href={href} onNavigate={onNavigate}>
                            {children}
                          </AssistantLink>
                        ),
                      }}
                    >
                      {text}
                    </MessageResponse>
                  </MessageContent>
                </Message>
              );
            })}
            {isTyping && (
              <Message from="assistant">
                <TypingIndicator />
              </Message>
            )}
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
