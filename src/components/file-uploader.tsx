"use client";

import { useCallback, useEffect, useState } from "react";
import type { FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { AlertCircle, FileText, Upload, Video, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";

const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export type FileKind = "images" | "videos" | "documents";

const ACCEPT_MAP: Record<FileKind, Record<string, string[]>> = {
  images: { "image/*": [] },
  videos: { "video/*": [] },
  documents: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
      ".pptx",
    ],
    "text/plain": [".txt"],
  },
};

const KIND_LABEL: Record<FileKind, string> = {
  images: "images",
  videos: "videos",
  documents: "documents",
};

export type MediaItem = {
  file?: File;
  key?: string;
  name: string;
  type: "image" | "video" | "document";
  size?: number;
  contentType?: string;
};

function truncateName(name: string, max = 30): string {
  return name.length > max ? name.slice(0, max) + "..." : name;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getDisplaySize(item: MediaItem): string {
  if (item.file instanceof File) return formatFileSize(item.file.size);
  if (typeof item.size === "number") return formatFileSize(item.size);
  return "";
}

function classifyFile(file: File): MediaItem["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

const TYPE_LABEL: Record<MediaItem["type"], string> = {
  image: "Image",
  video: "Video",
  document: "Document",
};

export function ImagePreview({ item }: { item: MediaItem }) {
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

interface FileUploaderProps {
  files?: MediaItem[];
  onFilesChange: (files: MediaItem[]) => void;
  maxFiles?: number;
  /** Which kinds of files the dropzone accepts. Combine freely, e.g. ["images", "documents"]. */
  accept?: FileKind[];
  maxFileSize?: number;
}

export default function FileUploader({
  files = [],
  onFilesChange,
  maxFiles = 3,
  accept = ["images"],
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = maxFiles - files.length;
      if (remaining <= 0) return;
      if (acceptedFiles.length > remaining) {
        toast.warning(
          `Only ${remaining} more file(s) can be added (max ${maxFiles}).`
        );
      }
      const toAdd: MediaItem[] = acceptedFiles
        .slice(0, remaining)
        .map((file) => ({
          file,
          name: file.name,
          type: classifyFile(file),
          size: file.size,
          contentType: file.type || undefined,
        }));
      onFilesChange([...files, ...toAdd]);
    },
    [files, maxFiles, onFilesChange]
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      rejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast.error(`"${file.name}" exceeds the ${formatFileSize(maxFileSize)} limit.`);
          } else if (error.code === "file-invalid-type") {
            toast.error(`"${file.name}" is not a supported file type.`);
          } else {
            toast.error(`"${file.name}": ${error.message}`);
          }
        });
      });
    },
    [maxFileSize]
  );

  const remove = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const atLimit = files.length >= maxFiles;

  const acceptMap = accept.reduce<Record<string, string[]>>(
    (map, kind) => ({ ...map, ...ACCEPT_MAP[kind] }),
    {}
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: acceptMap,
    multiple: true,
    maxSize: maxFileSize,
    disabled: atLimit,
  });

  const hint = accept.map((kind) => KIND_LABEL[kind]).join(" or ");

  return (
    <div className="space-y-2">
      {!atLimit && (
        <div
          {...getRootProps()}
          className={cn(
            "border-dashed border-2 p-5 text-center cursor-pointer rounded-lg transition-all",
            isDragActive
              ? "border-primary bg-accent"
              : "hover:border-primary hover:bg-accent"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm">Drop files here...</p>
          ) : (
            <>
              <p className="text-sm">
                Drag &amp; drop {hint} here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max {formatFileSize(maxFileSize)} per file
              </p>
            </>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-md border overflow-hidden pr-3"
            >
              {item.type === "image" ? (
                <ImagePreview item={item} />
              ) : (
                <div className="size-16 shrink-0 bg-muted flex items-center justify-center">
                  {item.type === "video" ? (
                    <Video className="size-6 text-muted-foreground" />
                  ) : (
                    <FileText className="size-6 text-muted-foreground" />
                  )}
                </div>
              )}

              <div className="flex-1 py-2">
                <p className="text-sm">{truncateName(item.name)}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-xs py-0">
                    {TYPE_LABEL[item.type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getDisplaySize(item)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {atLimit && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="size-3.5" />
          Maximum of {maxFiles} file{maxFiles !== 1 ? "s" : ""} reached.
        </p>
      )}
    </div>
  );
}
