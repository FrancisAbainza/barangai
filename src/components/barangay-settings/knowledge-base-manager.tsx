"use client";

import { useCallback } from "react";
import type { FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Download, FileTextIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatFileSize } from "@/components/file-uploader";
import DeleteKnowledgeBaseDocumentDialog from "@/components/barangay-settings/dialogs/delete-knowledge-base-document-dialog";
import { fetchFile, uploadFile } from "@/lib/storage";
import { addKnowledgeBaseDocument, getKnowledgeBaseDocuments } from "@/actions/knowledge-base";
import { MAX_KNOWLEDGE_BASE_FILE_SIZE } from "@/lib/ai-assistant/knowledge-base";

const KNOWLEDGE_BASE_QUERY_KEY = ["knowledge-base-documents"];

export default function KnowledgeBaseManager() {
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: KNOWLEDGE_BASE_QUERY_KEY,
    queryFn: getKnowledgeBaseDocuments,
  });

  // One file at a time, each in its own server action call, so a failed file doesn't stop the rest
  // and each one gets the action's full time limit to be read and embedded.
  const { mutate: uploadDocuments, isPending, variables: uploadingFiles } = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        try {
          const key = await uploadFile(file, "knowledge-base");
          await addKnowledgeBaseDocument({ key, fileName: file.name });
          queryClient.invalidateQueries({ queryKey: KNOWLEDGE_BASE_QUERY_KEY });
          toast.success(`"${file.name}" was added to the knowledge base.`);
        } catch {
          toast.error(`Failed to process "${file.name}". Please try again.`);
        }
      }
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) uploadDocuments(acceptedFiles);
    },
    [uploadDocuments]
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
    maxSize: MAX_KNOWLEDGE_BASE_FILE_SIZE,
    disabled: isPending,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="rounded-lg bg-primary/10 p-2 text-primary [&_svg]:size-5">
          <Bot />
        </div>
        <div>
          <CardTitle className="text-lg">AI Assistant Knowledge Base</CardTitle>
          <CardDescription>
            The PDFs the AI Assistant answers residents&apos; and admins&apos; questions from. It uses every document
            listed here, so remove any that are outdated.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-lg border p-6">
            <Spinner />
          </div>
        ) : documents?.length ? (
          <div className="space-y-2">
            {documents.map((kbDocument) => (
              <div key={kbDocument.id} className="flex items-center gap-2 rounded-lg border p-1 pr-3">
                <a
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
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
                <DeleteKnowledgeBaseDocumentDialog kbDocument={kbDocument} />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No knowledge base documents uploaded yet.
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
              <p className="text-sm">
                {uploadingFiles && uploadingFiles.length > 1 ? "Processing documents…" : "Processing document…"}
              </p>
            </>
          ) : (
            <>
              <UploadIcon className="size-6 text-muted-foreground" />
              <p className="text-sm">Drag & drop PDFs here, or click to select</p>
              <p className="text-xs text-muted-foreground">Max {formatFileSize(MAX_KNOWLEDGE_BASE_FILE_SIZE)} each</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
