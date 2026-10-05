"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useChat } from "@ai-sdk/react";
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
import { isAdminRole } from "@/lib/roles";

export function AiAssistantWidget() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  // Controlled (rather than left to DialogTrigger) so clicking a navigation button
  // in the chat can close the widget and let the user see the page.
  const [open, setOpen] = useState(false);

  // Lifted above the Dialog (which unmounts its content on close) so chat
  // history survives closing/reopening — it only resets on refresh/navigation.
  const { messages, sendMessage, status, stop } = useChat({
    onError: (error) => toast.error(error.message || "Something went wrong."),
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
