import PageHeader from "@/components/page-header";
import { Home } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Home}
        title="Home"
        description={`Access barangay services and facilities.`}
      />
    </div>
  );
}