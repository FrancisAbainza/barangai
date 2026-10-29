import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuthRole } from "@/lib/auth";
import { bucket, r2 } from "@/lib/r2";
import { PRIVATE_UPLOAD_PREFIXES, PUBLIC_UPLOAD_PREFIXES } from "@/lib/storage";

const UPLOAD_PREFIXES: readonly string[] = [...PUBLIC_UPLOAD_PREFIXES, ...PRIVATE_UPLOAD_PREFIXES];

// The prefix checks below compare the start of the key, so a ".." segment could otherwise
// pass one prefix's check and point into another.
function isValidKey(key: unknown): key is string {
  return typeof key === "string" && !key.split("/").includes("..");
}

function isPublicKey(key: string) {
  return PUBLIC_UPLOAD_PREFIXES.some((prefix) => key.startsWith(`${prefix}/`));
}

export async function POST(req: Request) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { prefix, name, type } = await req.json();
  if (!UPLOAD_PREFIXES.includes(prefix) || typeof name !== "string") {
    return new Response("Invalid upload", { status: 400 });
  }

  // Made here rather than by the client so an upload can't overwrite another file, and it
  // includes the uploader so DELETE can tell whose file it is.
  const key = `${prefix}/${userId}/${crypto.randomUUID()}-${name.replaceAll("/", "_")}`;
  if (isPublicKey(key) && !isAdmin) return new Response("Forbidden", { status: 403 });

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: type,
    }),
    {
      expiresIn: 60,
    }
  );

  return Response.json({ url, key });
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!isValidKey(key)) return new Response("Invalid key", { status: 400 });

  if (!isPublicKey(key)) {
    const { userId } = await getAuthRole();
    if (!userId) return new Response("Unauthorized", { status: 401 });
  }

  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    {
      expiresIn: 60 * 60,
    }
  );

  return Response.redirect(url, 302);
}

export async function DELETE(req: Request) {
  const { userId, isAdmin } = await getAuthRole();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { key } = await req.json();
  if (!isValidKey(key)) return new Response("Invalid key", { status: 400 });

  // Residents can delete only their own uploads. Files uploaded before keys included their
  // uploader can only be deleted by admins.
  const isOwnUpload = UPLOAD_PREFIXES.some((prefix) => key.startsWith(`${prefix}/${userId}/`));
  if (!isAdmin && !isOwnUpload) return new Response("Forbidden", { status: 403 });

  await r2.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  return Response.json({ success: true });
}
