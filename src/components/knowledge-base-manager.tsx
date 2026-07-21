"use client";

import { useCallback } from "react";
import type { FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileTextIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { formatFileSize } from "@/components/file-uploader";
import { fetchFile, uploadFile } from "@/lib/storage";
import { getKnowledgeBaseDocument, replaceKnowledgeBaseDocument } from "@/actions/knowledge-base";
import { MAX_KNOWLEDGE_BASE_FILE_SIZE } from "@/lib/knowledge-base";

const KNOWLEDGE_BASE_QUERY_KEY = ["knowledge-base-document"];

export function KnowledgeBaseManager() {
  const queryClient = useQueryClient();

  const { data: kbDocument, isLoading } = useQuery({
    queryKey: KNOWLEDGE_BASE_QUERY_KEY,
    queryFn: getKnowledgeBaseDocument,
  });

  const { mutate: uploadDocument, isPending } = useMutation({
    mutationFn: async (file: File) => {
      const key = await uploadFile(file, "knowledge-base");
      return replaceKnowledgeBaseDocument({ key, fileName: file.name });
    },
    onSuccess: (newDoc) => {
      queryClient.setQueryData(KNOWLEDGE_BASE_QUERY_KEY, newDoc);
      toast.success(`"${newDoc.fileName}" is now the assistant's knowledge base.`);
    },
    onError: () => {
      toast.error("Failed to process this document. Please try again.");
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) uploadDocument(file);
    },
    [uploadDocument]
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    for (const { file, errors } of rejections) {
      for (const error of errors) {
        if (error.code === "file-too-large") {
          toast.error(`"${file.name}" exceeds the ${formatFileSize(MAX_KNOWLEDGE_BASE_FILE_SIZE)} limit.`);
        } else if (error.code === "file-invalid-type") {
          toast.error(`"${file.name}" must be a PDF.`);
        } else {
          toast.error(`"${file.name}": ${error.message}`);
        }
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    maxSize: MAX_KNOWLEDGE_BASE_FILE_SIZE,
    disabled: isPending,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
      <p className="text-sm text-muted-foreground">
        Upload a PDF for the assistant to use as its knowledge base. Uploading a
        new file replaces the current one.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border p-6">
          <Spinner />
        </div>
      ) : kbDocument ? (
        <a
          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
          href={fetchFile(kbDocument.fileKey)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileTextIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{kbDocument.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {kbDocument.chunkCount} chunk{kbDocument.chunkCount !== 1 ? "s" : ""} indexed · uploaded by{" "}
              {kbDocument.uploadedByName} on {new Date(kbDocument.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Download className="size-4 shrink-0 text-muted-foreground" />
        </a>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No knowledge base document uploaded yet.
        </p>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-all",
          isDragActive ? "border-primary bg-accent" : "hover:border-primary hover:bg-accent",
          isPending && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        {isPending ? (
          <>
            <Spinner className="size-6" />
            <p className="text-sm">Processing document…</p>
          </>
        ) : (
          <>
            <UploadIcon className="size-6 text-muted-foreground" />
            <p className="text-sm">
              {kbDocument ? "Drag & drop to replace, or click to select" : "Drag & drop a PDF here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground">Max {formatFileSize(MAX_KNOWLEDGE_BASE_FILE_SIZE)}</p>
          </>
        )}
      </div>
    </div>
  );
}
