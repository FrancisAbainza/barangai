import { ChevronRight, type LucideIcon } from "lucide-react";

// Shared by the home page shortcut grids (as links) and the document type picker (as buttons).
export const shortcutTileClassName =
  "group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50";

interface ShortcutTileContentProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ShortcutTileContent({ icon: Icon, title, description }: ShortcutTileContentProps) {
  return (
    <>
      <div className="flex w-full items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-5" />
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </>
  );
}
