"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const COLLAPSED_LINES = 6;
const LINK_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

const DESCRIPTION_CLASS_NAME =
  "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap wrap-break-word";

function linkifyText(text: string) {
  return text.split(LINK_PATTERN).map((part, index) => {
    if (!/^(https?:\/\/|www\.)/i.test(part)) return part;

    const trailingPunctuation = part.match(/[.,!?;:]+$/)?.[0] ?? "";
    const linkText = part.slice(0, part.length - trailingPunctuation.length);
    const href = linkText.toLowerCase().startsWith("www.")
      ? `https://${linkText}`
      : linkText;

    if (!URL.canParse(href)) return part;

    return (
      <Fragment key={index}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
        >
          {linkText}
        </a>
        {trailingPunctuation}
      </Fragment>
    );
  });
}

export function ExpandableDescription({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLParagraphElement>(null);
  const [isExpandable, setIsExpandable] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const measurement = measurementRef.current;
    if (!container || !measurement) return;

    setIsExpanded(false);

    const updateExpandable = () => {
      const style = window.getComputedStyle(measurement);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const fontSize = Number.parseFloat(style.fontSize);
      const collapsedHeight = (Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.625) * COLLAPSED_LINES;

      setIsExpandable(measurement.getBoundingClientRect().height > collapsedHeight + 1);
    };

    updateExpandable();
    const observer = new ResizeObserver(updateExpandable);
    observer.observe(container);

    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className="relative space-y-1">
      <p className={`${DESCRIPTION_CLASS_NAME} ${isExpanded ? "" : "line-clamp-6"}`}>
        {linkifyText(text)}
      </p>
      <p
        ref={measurementRef}
        aria-hidden="true"
        className={`${DESCRIPTION_CLASS_NAME} pointer-events-none absolute inset-x-0 top-0 -z-10 invisible`}
      >
        {linkifyText(text)}
      </p>
      {isExpandable && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-sm"
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? "See less" : "See more"}
        </Button>
      )}
    </div>
  );
}
