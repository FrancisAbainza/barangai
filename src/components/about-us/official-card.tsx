import Image from "next/image";
import { User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import type { Official } from "@/db/schema";
import GoldTrim from "./gold-trim";

// The card is its own size container so the nameplate text steps down on narrow cards.
const cardClassName =
  "@container relative flex h-full flex-col overflow-hidden rounded-xl shadow-sm outline -outline-offset-1 outline-black/10 dark:outline-white/10";

export default function OfficialCard({ official }: { official: Official }) {
  const photoKey = official.photo[0]?.key;
  const src = photoKey ? fetchFile(photoKey) : null;

  return (
    <div className={cn("group transition-shadow hover:shadow-md", cardClassName)}>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {src ? (
          <Image
            src={src}
            alt={official.name}
            fill
            sizes="320px"
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <User className="size-16 text-muted-foreground" />
          </div>
        )}
      </div>

      <GoldTrim />

      <div className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-nameplate px-3 py-3 text-center text-primary-foreground">
        <h3 className="text-sm font-bold leading-snug text-balance @[13rem]:text-base">{official.name}</h3>
        <p className="text-xs text-primary-foreground/80 @[13rem]:text-sm">{official.position}</p>
      </div>
    </div>
  );
}

export function OfficialCardSkeleton() {
  return (
    <div className={cardClassName}>
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col items-center gap-2 px-3 py-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
