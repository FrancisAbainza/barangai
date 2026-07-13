"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquareWarning, SportShoe } from "lucide-react";
import StatCard from "@/components/stat-card";
import { getMyActivitySummary } from "@/actions/home";

function activityDescription(active: number): string {
  return active > 0 ? `${active} pending` : "All caught up";
}

export default function MyActivityStrip() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-activity-summary"],
    queryFn: getMyActivitySummary,
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">My Activity</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/portal/document-request">
          <StatCard
            label="Document Requests"
            value={data?.documentRequests.total ?? 0}
            description={activityDescription(data?.documentRequests.active ?? 0)}
            icon={FileText}
            isLoading={isLoading}
          />
        </Link>
        <Link href="/portal/complaint">
          <StatCard
            label="Complaints"
            value={data?.complaints.total ?? 0}
            description={activityDescription(data?.complaints.active ?? 0)}
            icon={MessageSquareWarning}
            isLoading={isLoading}
          />
        </Link>
        <Link href="/portal/court-reservation">
          <StatCard
            label="Court Reservations"
            value={data?.courtReservations.total ?? 0}
            description={activityDescription(data?.courtReservations.active ?? 0)}
            icon={SportShoe}
            isLoading={isLoading}
          />
        </Link>
      </div>
    </div>
  );
}
