import CreateTransparencyProjectDialog from "@/components/transparency/create-transparency-project-dialog";
import TransparencyProjectList from "@/components/transparency/transparency-project-list";
import PageHeader from "@/components/page-header";
import { getAuthRole } from "@/lib/auth";
import { Eye } from "lucide-react";

export default async function TrnasparencyPage() {
  const { isAdmin } = await getAuthRole();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        icon={Eye}
        title="Governance Transparency"
        description="Manage and track community projects and transparency data."
      >
        {isAdmin && <CreateTransparencyProjectDialog />}
      </PageHeader>
      <TransparencyProjectList />
    </div>
  );
}