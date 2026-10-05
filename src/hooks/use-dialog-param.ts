"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DIALOG_SEARCH_PARAM, type PortalDialogTargetId } from "@/lib/portal-dialogs";

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

    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  };

  return [open, setOpen];
}
