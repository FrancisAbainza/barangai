import { cn } from "@/lib/utils";

// The metallic gold line that edges the About Us nameplates.
export default function GoldTrim({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-1 bg-linear-to-r from-amber-500 via-yellow-200 to-amber-500", className)} />;
}
