"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { VIEW_SEARCH_PARAM } from "@/lib/ai-assistant/portal-dialogs";

/**
 * `useState`-like id of the record whose Submission Info dialog is open, stored in the
 * URL as `?view=<id>`. This lets links from elsewhere (e.g. the home page's Needs
 * Attention queue) land on a page with that record's dialog already open.
 *
 * Like `useDialogParam`, it uses `window.history.replaceState` so closing the
 * dialog is instant instead of a router navigation.
 *
 * `param` names a different search param for another dialog that shows a record by id,
 * e.g. `?business=<id>` for a business's details (`BUSINESS_SEARCH_PARAM`).
 */
export function useViewParam(param = VIEW_SEARCH_PARAM): [number | null, (id: number | null) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(param);
  const parsed = raw === null ? NaN : Number(raw);
  const viewId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;

  const setViewId = (id: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (id !== null) params.set(param, String(id));
    else params.delete(param);

    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  };

  return [viewId, setViewId];
}
