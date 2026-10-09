"use client";

import { usePathname, useSearchParams } from "next/navigation";

export const VIEW_SEARCH_PARAM = "view";

/**
 * `useState`-like id of the record whose Submission Info dialog is open, stored in the
 * URL as `?view=<id>`. This lets links from elsewhere (e.g. the home page's Needs
 * Attention queue) land on a page with that record's dialog already open.
 *
 * Like `useDialogParam`, it uses `window.history.replaceState` so closing the
 * dialog is instant instead of a router navigation.
 */
export function useViewParam(): [number | null, (id: number | null) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(VIEW_SEARCH_PARAM);
  const parsed = raw === null ? NaN : Number(raw);
  const viewId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;

  const setViewId = (id: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (id !== null) params.set(VIEW_SEARCH_PARAM, String(id));
    else params.delete(VIEW_SEARCH_PARAM);

    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  };

  return [viewId, setViewId];
}
