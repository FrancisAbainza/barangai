import { Settings } from "lucide-react";
import PageHeader from "@/components/page-header";
import BarangaySettings from "@/components/barangay-settings/barangay-settings";

export default function BarangaySettingsPage() {
  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Settings}
        title="Barangay Settings"
        description="Manage fees, mission and vision, and barangay and SK officials"
      />
      <BarangaySettings />
    </div>
  );
}
