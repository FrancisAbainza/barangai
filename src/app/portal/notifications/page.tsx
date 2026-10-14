"use client";

import PageHeader from "@/components/page-header";
import ResidentNotifications from "@/components/notifications/resident-notifications";
import { Bell } from "lucide-react";

// Resident-only: admins are redirected away in src/proxy.ts (`isResidentOnlyRoute`).
export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Updates on the status of your requests and submissions."
      />
      <ResidentNotifications />
    </div>
  );
}
