import PageHeader from "@/components/page-header";
import { Eye } from "lucide-react";

export default function TrnasparencyPage() {
  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Eye}
        title="Governance Transparency"
        description="Manage and track community projects and transparency data."
      />
    </div>
  );
}