"use client";

import { useEffect, useRef } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

export default function LoadMoreTrigger({
  colSpan,
  onIntersect,
  disabled,
}: {
  colSpan: number;
  onIntersect: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onIntersect();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, disabled]);

  return (
    <TableRow ref={ref}>
      <TableCell colSpan={colSpan} className="h-1 p-0" />
    </TableRow>
  );
}
