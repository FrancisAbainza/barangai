"use client";

import WelcomeBanner from "@/components/home/welcome-banner";
import ManagementShortcuts from "@/components/home/management-shortcuts";
import NeedsAttentionQueue from "@/components/home/needs-attention-queue";
import RecentActivityFeed from "@/components/home/recent-activity-feed";

export default function AdminHome() {
  return (
    <div className="space-y-6">
      <WelcomeBanner description="Manage barangay services, monitor resident activity, and keep the community informed." />
      <ManagementShortcuts />
      <NeedsAttentionQueue />
      <RecentActivityFeed />
    </div>
  );
}
