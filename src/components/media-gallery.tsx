"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, FileText, Play, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import type { MediaItem } from "@/components/file-uploader";

type GalleryItem = Omit<MediaItem, "file">;

function MediaViewerDialog({
  media,
  startIndex,
  open,
  onOpenChange,
}: {
  media: GalleryItem[];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl border-none bg-black p-0 text-white sm:max-w-6xl overflow-hidden **:data-[slot=dialog-close]:bg-black/50 **:data-[slot=dialog-close]:text-white **:data-[slot=dialog-close]:hover:bg-black/70"
        showCloseButton
      >
        <DialogTitle className="sr-only">Media viewer</DialogTitle>
        <Carousel opts={{ startIndex }} className="w-full">
          <CarouselContent className="ml-0">
            {media.map((item, index) => {
              const url = item.key ? fetchFile(item.key) : "";
              return (
                <CarouselItem key={index} className="flex items-center justify-center pl-0">
                  <div className="relative aspect-video w-full">
                    {item.type === "video" ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Image
                        src={url}
                        alt={item.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    )}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          {media.length > 1 && (
            <>
              <CarouselPrevious className="left-4 text-foreground" />
              <CarouselNext className="right-4 text-foreground" />
            </>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}

export function MediaGrid({ media }: { media: GalleryItem[] }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (!media.length) return null;

  const items = media.slice(0, 2);
  const remainingCount = media.length - items.length;

  const openViewer = (index: number) => {
    setStartIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          "grid gap-0.5 rounded-lg overflow-hidden",
          items.length === 1 ? "grid-cols-1" : "grid-cols-2"
        )}
      >
        {items.map((item, index) => {
          const url = item.key ? fetchFile(item.key) : "";
          const showMoreOverlay = index === items.length - 1 && remainingCount > 0;

          return (
            <button
              key={index}
              type="button"
              onClick={() => openViewer(index)}
              className="group relative aspect-video bg-muted block w-full p-0 border-0 cursor-pointer min-h-[250px] max-h-[600px] overflow-hidden"
            >
              {item.type === "video" ? (
                <>
                  <video src={url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/80 rounded-full p-3">
                      <Play className="size-5 fill-current" />
                    </div>
                  </div>
                </>
              ) : (
                <Image src={url} alt={item.name} fill className="object-cover" unoptimized />
              )}
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              {showMoreOverlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <span className="flex items-center gap-1 text-2xl font-semibold text-white">
                    <Plus className="size-6" />
                    {remainingCount}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <MediaViewerDialog
        media={media}
        startIndex={startIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  );
}

function DownloadableAttachment({ item }: { item: GalleryItem }) {
  const handleClick = () => {
    if (!item.key) return;
    window.open(fetchFile(item.key), "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate flex-1">{item.name}</span>
      <Download className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function AttachmentList({ attachments }: { attachments: GalleryItem[] }) {
  if (!attachments.length) return null;

  return (
    <div className="space-y-1 rounded-lg border p-1">
      {attachments.map((item, index) => (
        <DownloadableAttachment key={index} item={item} />
      ))}
    </div>
  );
}
