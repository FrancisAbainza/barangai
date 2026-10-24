"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  DIALOG_SEARCH_PARAM,
  parseDialogPrefill,
  PREFILL_SEARCH_PARAM,
  type PortalDialogTargetId,
} from "@/lib/ai-assistant/portal-dialogs";

/**
 * `useState`-like open state for a form dialog, stored in the URL as `?dialog=<id>`.
 * This is what lets the AI assistant's form buttons (which link to `getPortalDialogHref`)
 * open a dialog on another page, and it also makes the open form survive a refresh.
 *
 * Uses `window.history.replaceState`, which Next.js syncs with `useSearchParams`,
 * so opening/closing is instant instead of a router navigation (a server round
 * trip on these dynamic pages).
 */
export function useDialogParam(dialog: PortalDialogTargetId): [boolean, (open: boolean) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams.get(DIALOG_SEARCH_PARAM) === dialog;

  const setOpen = (nextOpen: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (nextOpen) params.set(DIALOG_SEARCH_PARAM, dialog);
    else params.delete(DIALOG_SEARCH_PARAM);
    // The assistant's values only apply to the form it opened.
    params.delete(PREFILL_SEARCH_PARAM);

    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  };

  return [open, setOpen];
}

/**
 * The values the AI assistant filled in for this dialog's form (`?prefill=`), to spread
 * into the form's `defaultValues`. Empty unless the URL opens this dialog. The form only
 * reads them when it mounts, which is each time the dialog opens.
 */
export function useDialogPrefill(dialog: PortalDialogTargetId): Record<string, unknown> {
  const searchParams = useSearchParams();
  if (searchParams.get(DIALOG_SEARCH_PARAM) !== dialog) return {};
  return parseDialogPrefill(dialog, searchParams.get(PREFILL_SEARCH_PARAM));
}
