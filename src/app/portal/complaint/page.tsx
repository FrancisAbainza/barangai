"use client";

import { useUser } from "@clerk/nextjs";
import PageHeader from "@/components/page-header";
import ResidentComplaint from "@/components/complaint/resident-complaint";
import AdminComplaint from "@/components/complaint/admin-complaint";
import { isAdminRole } from "@/lib/roles";
import { MessageSquareWarning } from "lucide-react";

export default function ComplaintPage() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={MessageSquareWarning}
        title="Complaint Reporting"
        description="Track and manage your reported community concerns."
      />

      {isAdmin ? <AdminComplaint /> : <ResidentComplaint />}
    </div>
  );
}
