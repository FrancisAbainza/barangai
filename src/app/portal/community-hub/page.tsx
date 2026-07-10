import PageHeader from "@/components/page-header";
import { Store } from "lucide-react";

export default function CommunityHubPage() {
  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Store}
        title="Community Hub"
        description="Discover and support local businesses in our business directory."
      />
    </div>
  );
}