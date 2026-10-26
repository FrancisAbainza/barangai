import { notFound } from "next/navigation";
import NewsPostDetail from "@/components/news/news-post-detail";
import { getNewsById } from "@/actions/news";

// Where signed-in users land from a /news/[id] share link (src/proxy.ts) and the AI assistant's
// news buttons, so the portal layout and the assistant stay mounted.
export default async function PortalNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const news = Number.isNaN(id) ? null : await getNewsById(id);
  if (!news) notFound();

  return <NewsPostDetail initialNews={news} />;
}
