"use client";

import { useUser } from "@clerk/nextjs";
import CreateBusinessDialog from "@/components/community-hub/dialogs/create-business-dialog";
import AdminCommunityHub from "@/components/community-hub/admin-community-hub";
import ResidentCommunityHub from "@/components/community-hub/resident-community-hub";
import PageHeader from "@/components/page-header";
import { isAdminRole } from "@/lib/roles";
import { Store } from "lucide-react";

export default function CommunityHubPage() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Store}
        title="Community Hub"
        description="Discover and support local businesses in our business directory."
      >
        {!isAdmin && <CreateBusinessDialog />}
      </PageHeader>

      {isAdmin ? <AdminCommunityHub /> : <ResidentCommunityHub />}
    </div>
  );
}