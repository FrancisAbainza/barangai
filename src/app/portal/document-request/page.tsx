"use client";

import { useUser } from "@clerk/nextjs";
import PageHeader from "@/components/page-header";
import ResidentDocumentRequest from "@/components/document-request/resident-document-request";
import AdminDocumentRequestTable from "@/components/document-request/admin-document-request-table";
import { isAdminRole } from "@/lib/roles";
import { FileText } from "lucide-react";

export default function DocumentRequest() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={FileText}
        title="Document Request"
        description="Seamless online application and processing of barangay certificates."
      />

      {isAdmin ? <AdminDocumentRequestTable /> : <ResidentDocumentRequest />}
    </div>
  );
}