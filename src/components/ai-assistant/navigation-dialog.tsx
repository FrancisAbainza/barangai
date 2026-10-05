"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
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
import { PORTAL_NAVIGATION_TARGETS, type PortalNavigationTargetId } from "@/lib/portal-navigation";

// Handles the assistant's `navigateToPage` tool. The server leaves that tool call
// without a result (see src/lib/ai-assistant.ts), so it sits here until the user
// confirms or cancels, and we report the outcome back to the model.

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

type NavigationDialogProps = {
  messages: UIMessage[];
  addToolOutput: UseChatHelpers<UIMessage>["addToolOutput"];
  // Called after the user confirms, so the chat widget can get out of the way.
  onNavigate: () => void;
};

export function NavigationDialog({ messages, addToolOutput, onNavigate }: NavigationDialogProps) {
  const router = useRouter();

  // Guards against resolving the same tool call twice — Cancel's onClick and the
  // dialog's own onOpenChange(false) both fire from a single click.
  const resolvedToolCallIds = useRef(new Set<string>());

  const pending = findPendingNavigation(messages);

  const resolve = (navigation: PendingNavigation, approved: boolean) => {
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
      onNavigate();
      router.push(PORTAL_NAVIGATION_TARGETS[navigation.page].href);
    }
  };

  return (
    <AlertDialog
      open={pending != null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && pending) resolve(pending, false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {pending ? `Go to ${PORTAL_NAVIGATION_TARGETS[pending.page].label}?` : "Navigate?"}
          </AlertDialogTitle>
          <AlertDialogDescription>{pending?.reason}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => pending && resolve(pending, false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => pending && resolve(pending, true)}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
