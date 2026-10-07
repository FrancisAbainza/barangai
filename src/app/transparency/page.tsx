import TransparencyProjectList from "@/components/transparency/transparency-project-list";
import PageHeader from "@/components/page-header";
import { barangayName } from "@/lib/data";
import { Eye } from "lucide-react";

export default function TransparencyPage() {
  return (
    <div className="w-full md:container space-y-6 m-auto px-6 py-20">
      <PageHeader
        icon={Eye}
        title="Governance Transparency"
        description={`See the projects and programs of ${barangayName}.`}
      />
      <TransparencyProjectList />
    </div>
  );
}
