"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MediaLightboxProps {
  src: string;
  alt: string;
  type?: "image" | "video";
  className?: string;
  children: React.ReactNode;
}

export default function MediaLightbox({ src, alt, type = "image", className, children }: MediaLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button type="button" className={cn("block cursor-zoom-in text-left", className)}>
          {children}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPortal>
        <DialogOverlay className="bg-black/90 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none duration-150",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          )}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {type === "video" ? (
            <video
              src={src}
              controls
              autoPlay
              playsInline
              className="block max-h-[85vh] max-w-[calc(100vw-2rem)] rounded-lg drop-shadow-2xl sm:max-w-100vw"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- intrinsic size is unknown, so the dialog must hug the image's natural rendered dimensions
            <img
              src={src}
              alt={alt}
              className="block max-h-[85vh] max-w-[calc(100vw-2rem)] rounded-lg drop-shadow-2xl sm:max-w-100vw"
            />
          )}
          <DialogPrimitive.Close
            className={cn(
              "absolute top-3 right-3 rounded-full bg-black/50 p-2 text-white/90",
              "transition-colors hover:bg-black/70 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            )}
          >
            <XIcon className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
