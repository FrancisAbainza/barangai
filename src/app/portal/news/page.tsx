import CreateNewsDialog from "@/components/news/create-news-dialog";
import NewsList from "@/components/news/news-list";
import PageHeader from "@/components/page-header";
import { barangayName } from "@/lib/data";
import { getAuthRole } from "@/lib/auth";
import { Megaphone } from "lucide-react";

export default async function NewsPage() {
  const { isAdmin } = await getAuthRole();

  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Megaphone}
        title="News & Announcements"
        description={`Stay informed with the latest updates from ${barangayName}.`}
      >
        {isAdmin && <CreateNewsDialog />}
      </PageHeader>
      <NewsList />
    </div>
  );
}