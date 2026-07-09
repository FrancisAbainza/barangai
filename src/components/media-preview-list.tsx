"use client";

import Image from "next/image";
import { Download, FileText, Video } from "lucide-react";
import MediaLightbox from "@/components/media-lightbox";
import { fetchFile } from "@/lib/storage";
import type { MediaItem } from "@/components/file-uploader";

export default function MediaPreviewList({ items }: { items: MediaItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const url = item.key ? fetchFile(item.key) : "";

        if (item.type === "image" || item.type === "video") {
          return (
            <MediaLightbox key={index} src={url} alt={item.name} type={item.type} className="w-full">
              <div className="flex items-center gap-3 rounded-md border p-2 transition-colors hover:bg-accent">
                {item.type === "image" ? (
                  <div className="relative size-12 shrink-0 overflow-hidden rounded">
                    <Image src={url} alt={item.name} fill sizes="48px" className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                    <Video className="size-5 text-muted-foreground" />
                  </div>
                )}
                <span className="flex-1 truncate text-sm">{item.name}</span>
              </div>
            </MediaLightbox>
          );
        }

        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md border p-2 transition-colors hover:bg-accent"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <span className="flex-1 truncate text-sm">{item.name}</span>
            <Download className="size-4 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}
