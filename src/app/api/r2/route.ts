import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucket, r2 } from "@/lib/r2";

export async function POST(req: Request) {
  const { key, type } = await req.json();

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

  return Response.json({ url });
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key")!;

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
  const { key } = await req.json();

  await r2.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  return Response.json({ success: true });
}