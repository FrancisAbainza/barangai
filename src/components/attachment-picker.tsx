import { useCallback } from "react";
import type { FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { AlertCircle, FileText, Paperclip, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ACCEPTED_TYPES: Record<string, string[]> = {
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
};

export type AttachmentItem = {
  file?: File;
  key?: string;
  name: string;
  size?: number;
  contentType?: string;
};

function truncateName(name: string, max = 30): string {
  return name.length > max ? name.slice(0, max) + "..." : name;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDisplaySize(item: AttachmentItem): string {
  if (typeof item.size === "number") return formatFileSize(item.size);
  if (item.file instanceof File) return formatFileSize(item.file.size);
  return "";
}

interface AttachmentPickerProps {
  files?: AttachmentItem[];
  onFilesChange: (files: AttachmentItem[]) => void;
  maxFiles?: number;
}

export default function AttachmentPicker({
  files = [],
  onFilesChange,
  maxFiles = 3,
}: AttachmentPickerProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = maxFiles - files.length;
      if (remaining <= 0) return;
      if (acceptedFiles.length > remaining) {
        toast.warning(
          `Only ${remaining} more attachment(s) can be added (max ${maxFiles}).`
        );
      }
      const toAdd: AttachmentItem[] = acceptedFiles
        .slice(0, remaining)
        .map((file) => ({
          file,
          name: file.name,
          size: file.size,
          contentType: file.type || undefined,
        }));
      onFilesChange([...files, ...toAdd]);
    },
    [files, maxFiles, onFilesChange]
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    rejections.forEach(({ file, errors }) => {
      errors.forEach((error) => {
        if (error.code === "file-too-large") {
          toast.error(`"${file.name}" exceeds the 20 MB limit.`);
        } else if (error.code === "file-invalid-type") {
          toast.error(`"${file.name}" is not a supported file type.`);
        } else {
          toast.error(`"${file.name}": ${error.message}`);
        }
      });
    });
  }, []);

  const remove = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const atLimit = files.length >= maxFiles;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPTED_TYPES,
    multiple: true,
    maxSize: MAX_FILE_SIZE,
    disabled: atLimit,
  });

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
          <Paperclip className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm">Drop files here...</p>
          ) : (
            <>
              <p className="text-sm">
                Drag &amp; drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word, Excel, PowerPoint — max 20 MB per file
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
              className="flex items-center gap-3 border rounded-md px-3 py-2 overflow-hidden"
            >
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm">{truncateName(item.name)}</p>
                <p className="text-xs text-muted-foreground">
                  {getDisplaySize(item)}
                </p>
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
          Maximum of {maxFiles} attachment{maxFiles !== 1 ? "s" : ""} reached.
        </p>
      )}
    </div>
  );
}