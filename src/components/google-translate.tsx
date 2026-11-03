"use client";

import { useEffect, useSyncExternalStore } from "react";

// Google Translate reads the target language from this cookie ("/<from>/<to>") and
// translates the page as soon as its script loads. "tl" is Google's code for Filipino.
const LANGUAGE_COOKIE = "googtrans";
const FILIPINO_COOKIE_VALUE = "/en/tl";
const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";

type TranslateElementConstructor = new (
  options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
  elementId: string,
) => unknown;

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

// The cookie only changes right before a reload, so there's nothing to subscribe to.
const subscribeNoop = () => () => {};
const getIsFilipino = () =>
  document.cookie.split("; ").includes(`${LANGUAGE_COOKIE}=${FILIPINO_COOKIE_VALUE}`);

// False during SSR, so the page always hydrates in English.
export function useIsFilipino() {
  return useSyncExternalStore(subscribeNoop, getIsFilipino, () => false);
}

export function setFilipino(isFilipino: boolean) {
  // Google also sets its own copies of the cookie with a domain attribute, so clear every variant.
  const host = window.location.hostname;
  for (const domain of ["", `; domain=${host}`, `; domain=.${host}`]) {
    document.cookie = `${LANGUAGE_COOKIE}=; path=/; max-age=0${domain}`;
  }
  if (isFilipino) {
    document.cookie = `${LANGUAGE_COOKIE}=${FILIPINO_COOKIE_VALUE}; path=/; max-age=31536000`;
  }
  // Undoing Google's changes in place isn't reliable, so reload either way.
  window.location.reload();
}

// Google Translate swaps text nodes for its own <font> elements, so React later tries to remove
// or insert next to nodes that are no longer where it left them and throws. Skip those calls
// instead of crashing the page (https://github.com/facebook/react/issues/11538).
function preventTranslationCrashes() {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, child: Node | null): T {
    if (child && child.parentNode !== this) return node;
    return originalInsertBefore.call(this, node, child) as T;
  };
}

// Loads Google Translate only for visitors who picked Filipino, so English visitors don't pay
// for its script. The CSS in globals.css hides Google's banner and hover tooltips.
export function GoogleTranslate() {
  const isFilipino = useIsFilipino();

  useEffect(() => {
    if (!isFilipino || document.getElementById(SCRIPT_ID)) return;

    preventTranslationCrashes();
    window.googleTranslateElementInit = () => {
      const { TranslateElement } = (
        window as unknown as { google: { translate: { TranslateElement: TranslateElementConstructor } } }
      ).google.translate;
      new TranslateElement({ pageLanguage: "en", includedLanguages: "tl", autoDisplay: false }, ELEMENT_ID);
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, [isFilipino]);

  return isFilipino ? <div id={ELEMENT_ID} hidden /> : null;
}
