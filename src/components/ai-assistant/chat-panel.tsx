"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { BotIcon } from "lucide-react";
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
      onTranscriptionChange={(text) => textInput.setInput(textInput.value ? `${textInput.value} ${text}` : text)}
      size="icon-sm"
    />
  );
}

type ChatPanelProps = Pick<UseChatHelpers<UIMessage>, "messages" | "sendMessage" | "status" | "stop">;

export function ChatPanel({ messages, sendMessage, status, stop }: ChatPanelProps) {
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
