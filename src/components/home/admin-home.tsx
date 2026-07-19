"use client";

import WelcomeBanner from "@/components/home/welcome-banner";
import ManagementShortcuts from "@/components/home/management-shortcuts";
import PendingRequestsSummary from "@/components/home/pending-requests-summary";
import NeedsAttentionQueue from "@/components/home/needs-attention-queue";

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <WelcomeBanner description="Manage barangay services, monitor resident activity, and keep the community informed." />
      <ManagementShortcuts />
      <PendingRequestsSummary />
      <NeedsAttentionQueue />
    </div>
  );
}
