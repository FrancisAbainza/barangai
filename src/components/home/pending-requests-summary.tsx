"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquareWarning, SportShoe, Store } from "lucide-react";
import StatCard from "@/components/stat-card";
import { getAdminPendingCounts } from "@/actions/home";

export default function PendingRequestsSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: getAdminPendingCounts,
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Pending Requests</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/portal/document-request">
          <StatCard
            label="Document Requests"
            value={data?.documentRequests ?? 0}
            description="Awaiting review"
            icon={FileText}
            isLoading={isLoading}
          />
        </Link>
        <Link href="/portal/community-hub">
          <StatCard
            label="Community Hub"
            value={data?.communityHub ?? 0}
            description="Awaiting review"
            icon={Store}
            isLoading={isLoading}
          />
        </Link>
        <Link href="/portal/court-reservation">
          <StatCard
            label="Court Reservations"
            value={data?.courtReservations ?? 0}
            description="Awaiting review"
            icon={SportShoe}
            isLoading={isLoading}
          />
        </Link>
        <Link href="/portal/complaint">
          <StatCard
            label="Complaints"
            value={data?.complaints ?? 0}
            description="Awaiting review"
            icon={MessageSquareWarning}
            isLoading={isLoading}
          />
        </Link>
      </div>
    </div>
  );
}
