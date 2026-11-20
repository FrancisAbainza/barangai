// Where uploads may go. Files under a public prefix are shown on the signed-out pages, so anyone
// can view them and only admins can upload there. Every other file needs a signed-in user to view.
import type { MediaItem } from "@/components/file-uploader";

export const PUBLIC_UPLOAD_PREFIXES = [
  "officials",
  "news/media",
  "news/attachments",
  "transparency/media",
  "transparency/attachments",
] as const;

export const PRIVATE_UPLOAD_PREFIXES = [
  "profile/valid-id",
  "complaints/evidence",
  "complaints/resolution-attachments",
  "complaints/dismissal-attachments",
  "document-requests/payment-receipts",
  "document-requests/supporting-documents",
  "document-requests/pickup-attachments",
  "document-requests/rejection-attachments",
  "court-reservations/gcash-payments",
  "court-reservations/rejection-attachments",
  "community-hub/photos",
  "community-hub/permits",
  "community-hub/rejection-attachments",
  "knowledge-base",
] as const;

export type UploadPrefix = (typeof PUBLIC_UPLOAD_PREFIXES)[number] | (typeof PRIVATE_UPLOAD_PREFIXES)[number];

export async function uploadFile(file: File, prefix: UploadPrefix): Promise<string> {
  const response = await fetch("/api/r2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, name: file.name, type: file.type }),
  });
  if (!response.ok) throw new Error("Failed to upload file");

  const { url, key } = await response.json();
  await fetch(url, { method: "PUT", body: file });
  return key;
}

export async function uploadAddedFiles(
  files: readonly MediaItem[],
  prefix: UploadPrefix
): Promise<MediaItem[]> {
  return Promise.all(
    files.map(async (item) => {
      if (!item.file) return item;
      const key = await uploadFile(item.file, prefix);
      return { ...item, key, file: undefined };
    })
  );
}

export function fetchFile(key: string): string {
  return `/api/r2?key=${encodeURIComponent(key)}`;
}

export async function deleteFile(key: string): Promise<void> {
  const response = await fetch("/api/r2", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!response.ok) throw new Error("Failed to delete file");
}

export async function deleteRemovedFiles(
  previousFiles: readonly { key?: string }[],
  nextFiles: readonly { key?: string }[]
): Promise<boolean> {
  const nextKeys = new Set(nextFiles.map((file) => file.key).filter((key): key is string => !!key));
  const removedKeys = new Set(
    previousFiles
      .map((file) => file.key)
      .filter((key): key is string => !!key && !nextKeys.has(key))
  );
  const results = await Promise.allSettled([...removedKeys].map(deleteFile));
  return results.some((result) => result.status === "rejected");
}
