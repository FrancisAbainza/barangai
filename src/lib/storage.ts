export async function uploadFile(file: File, prefix: string): Promise<string> {
  const key = `${prefix}/${crypto.randomUUID()}-${file.name}`;
  const { url } = await fetch("/api/r2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, type: file.type }),
  }).then((r) => r.json());
  await fetch(url, { method: "PUT", body: file });
  return key;
}

export function fetchFile(key: string): string {
  return `/api/r2?key=${encodeURIComponent(key)}`;
}

export async function deleteFile(key: string): Promise<void> {
  await fetch("/api/r2", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}
