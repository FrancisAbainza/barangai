"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import Image from "next/image";
import { fetchFile } from "@/lib/storage";
import { Badge } from "./ui/badge";
import { XIcon, Upload, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

const ACCEPT_MAP = {
  images: { "image/*": [] },
  videos: { "video/*": [] },
  both: { "image/*": [], "video/*": [] },
} satisfies Record<string, Record<string, string[]>>;

const HINT_MAP = {
  images: "images",
  videos: "videos",
  both: "images or videos",
};

export type MediaItem = {
  file?: File;
  key?: string;
  name: string;
  type: "image" | "video";
  size?: number;
  contentType?: string;
};

function truncateName(name: string, max = 30): string {
  return name.length > max ? name.slice(0, max) + "..." : name;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function ImagePreview({ item }: { item: MediaItem }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (item.file) {
      const url = URL.createObjectURL(item.file);
      setSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    if (item.key) {
      const url = fetchFile(item.key);
      setSrc(url);
    }
  }, [item.file, item.key]);

  if (!src) {
    return (
      <div className="size-16 shrink-0 bg-muted flex items-center justify-center">
        <Upload className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative size-16 shrink-0">
      <Image src={src} alt={item.name} fill sizes="64px" className="object-cover" unoptimized />
    </div>
  );
}

interface MediaUploaderProps {
  media?: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxFiles?: number;
  accept?: "images" | "videos" | "both";
}

export default function MediaUploader({
  media = [],
  onMediaChange,
  maxFiles = 3,
  accept = "both",
}: MediaUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = maxFiles - media.length;
      if (remaining <= 0) return;
      if (acceptedFiles.length > remaining) {
        toast.warning(
          `Only ${remaining} more file(s) can be added (max ${maxFiles}).`
        );
      }
      const newItems: MediaItem[] = acceptedFiles
        .slice(0, remaining)
        .map((file) => ({
          file,
          name: file.name,
          type: file.type.startsWith("video/") ? "video" : "image",
          size: file.size,
          contentType: file.type || undefined,
        }));
      onMediaChange([...media, ...newItems]);
    },
    [media, onMediaChange, maxFiles],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    rejections.forEach(({ file, errors }) => {
      errors.forEach((error) => {
        if (error.code === "file-too-large") {
          toast.error(`"${file.name}" exceeds the 500 MB size limit.`);
        } else if (error.code === "file-invalid-type") {
          toast.error(`"${file.name}" is not a supported file type.`);
        } else {
          toast.error(`"${file.name}": ${error.message}`);
        }
      });
    });
  }, []);

  const handleDelete = (index: number) => {
    onMediaChange(media.filter((_, i) => i !== index));
  };

  const atLimit = media.length >= maxFiles;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPT_MAP[accept],
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  return (
    <div>
      {!atLimit && (
        <div
          {...getRootProps()}
          className="border-dashed border-2 p-6 text-center cursor-pointer rounded-lg hover:border-primary hover:bg-accent transition-all"
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p>Drop files here&hellip;</p>
          ) : (
            <p>Drag &amp; drop {HINT_MAP[accept]} here, or click to select</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">Max 500 MB per file</p>
        </div>
      )}

      <div>
        {media.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border rounded-md shadow-xs overflow-hidden mt-3 pr-3"
          >
            {item.type === "image" ? (
              <ImagePreview item={item} />
            ) : (
              <div className="size-16 shrink-0 bg-muted flex items-center justify-center">
                <Video className="size-6 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 py-3">
              <p className="text-sm">{truncateName(item.name)}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-xs py-0">
                  {item.type === "image" ? "Image" : "Video"}
                </Badge>
                {(item.file || typeof item.size === "number") && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(item.file?.size ?? item.size ?? 0)}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDelete(index)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {atLimit && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
          <AlertCircle className="size-3.5" />
          Maximum of {maxFiles} {maxFiles !== 1 ? "files" : "file"} reached.
        </p>
      )}
    </div>
  );
}
