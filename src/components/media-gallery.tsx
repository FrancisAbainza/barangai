"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, FileText, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Carousel,
  type CarouselApi,
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
        className="inset-0 top-0 left-0 block h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-none bg-black p-0 text-white ring-0 sm:max-w-none **:data-[slot=dialog-close]:z-10 **:data-[slot=dialog-close]:bg-black/50 **:data-[slot=dialog-close]:text-white **:data-[slot=dialog-close]:hover:bg-black/70"
        showCloseButton
      >
        <DialogTitle className="sr-only">Media viewer</DialogTitle>
        <Carousel opts={{ startIndex }} className="h-full w-full">
          <CarouselContent className="ml-0">
            {media.map((item, index) => {
              const url = item.key ? fetchFile(item.key) : "";
              return (
                <CarouselItem key={index} className="pl-0">
                  <div className="relative h-dvh w-full">
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
              <CarouselPrevious className="left-4 border-none bg-black/60 text-white hover:bg-black/80 hover:text-white disabled:hidden" />
              <CarouselNext className="right-4 border-none bg-black/60 text-white hover:bg-black/80 hover:text-white disabled:hidden" />
            </>
          )}
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}

export function MediaGrid({ media }: { media: GalleryItem[] }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  if (!media.length) return null;

  const hasMultiple = media.length > 1;

  return (
    <>
      <Carousel setApi={setApi} className="overflow-hidden rounded-lg bg-muted">
        <CarouselContent className="ml-0">
          {media.map((item, index) => {
            const url = item.key ? fetchFile(item.key) : "";

            return (
              <CarouselItem key={index} className="pl-0">
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className="group relative block h-[450px] w-full cursor-pointer overflow-hidden border-0 p-0 sm:h-[580px]"
                >
                  {item.type === "video" ? (
                    <>
                      <video src={url} className="relative h-full w-full bg-black object-contain" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-white/80 p-3">
                          <Play className="size-5 fill-current" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Blurred backdrop fills the letterbox around a contained image */}
                      <Image
                        src={url}
                        alt=""
                        aria-hidden
                        fill
                        className="scale-110 object-cover opacity-60 blur-2xl"
                        unoptimized
                      />
                      <Image src={url} alt={item.name} fill className="object-contain" unoptimized />
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {hasMultiple && (
          <>
            <CarouselPrevious className="left-3 border-none bg-black/60 text-white hover:bg-black/80 hover:text-white disabled:hidden" />
            <CarouselNext className="right-3 border-none bg-black/60 text-white hover:bg-black/80 hover:text-white disabled:hidden" />
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/60 px-2 py-1.5">
              {media.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => api?.scrollTo(index)}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    index === current ? "bg-white" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>

      <MediaViewerDialog
        key={viewerOpen ? current : undefined}
        media={media}
        startIndex={current}
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
