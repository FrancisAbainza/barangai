"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Megaphone } from "lucide-react";
import EmptyState from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { getNewsById, type NewsWithAuthor } from "@/actions/news";
import NewsCard from "./news-card";

// One post in the portal (/portal/news/[id]). It's cached under ["news"] like the list, so the
// card's reactions, edits and deletes, which invalidate ["news"], refresh it too.
export default function NewsPostDetail({ initialNews }: { initialNews: NewsWithAuthor }) {
  const { data: news } = useQuery({
    queryKey: ["news", "post", initialNews.id],
    queryFn: () => getNewsById(initialNews.id),
    initialData: initialNews,
  });

  return (
    <div className="mx-auto w-full space-y-4 md:max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2 gap-2">
        <Link href="/portal/news">
          <ArrowLeft className="size-4" />
          Back to News
        </Link>
      </Button>
      {news ? (
        <NewsCard news={news} />
      ) : (
        <EmptyState icon={Megaphone} title="Post not found" description="This post has been deleted." />
      )}
    </div>
  );
}
