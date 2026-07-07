"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt: string;
  className?: string;
  children: React.ReactNode;
}

export default function ImageLightbox({ src, alt, className, children }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("block text-left", className)}
      >
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="max-w-[calc(100%-2rem)] border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="relative h-[80vh] w-full">
            <Image src={src} alt={alt} fill sizes="90vw" className="object-contain" unoptimized />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
