import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import NewsCard from "@/components/news/news-card";
import { getNewsById } from "@/actions/news";
import { fetchFile } from "@/lib/storage";
import { barangayName } from "@/lib/data";

async function getOrigin() {
  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${headersList.get("host")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = Number((await params).id);
  const news = Number.isNaN(id) ? null : await getNewsById(id);
  if (!news) return {};

  const origin = await getOrigin();
  const description =
    news.content.length > 200 ? `${news.content.slice(0, 200)}…` : news.content;
  const image = news.media.find((item) => item.type === "image");

  return {
    title: `${news.title} · ${barangayName}`,
    description,
    openGraph: {
      title: news.title,
      description,
      url: `${origin}/news/${news.id}`,
      images: image?.key ? [`${origin}${fetchFile(image.key)}`] : undefined,
    },
  };
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const news = Number.isNaN(id) ? null : await getNewsById(id);
  if (!news) notFound();

  return (
    <div className="container max-w-2xl space-y-4 m-auto px-6 py-20">
      <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2">
        <Link href="/news">
          <ArrowLeft className="size-4" />
          Back to News
        </Link>
      </Button>
      <NewsCard news={news} />
    </div>
  );
}
