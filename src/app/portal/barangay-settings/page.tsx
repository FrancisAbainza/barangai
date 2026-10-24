import { Settings } from "lucide-react";
import PageHeader from "@/components/page-header";
import BarangaySettings from "@/components/barangay-settings/barangay-settings";

export default function BarangaySettingsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        icon={Settings}
        title="Barangay Settings"
        description="Manage fees, goal, mission and vision, contact information, and barangay and SK officials"
      />
      <BarangaySettings />
    </div>
  );
}
