"use client";

import { useUser } from "@clerk/nextjs";
import PageHeader from "@/components/page-header";
import ResidentCourtReservation from "@/components/court-reservation/resident-court-reservation";
import AdminCourtReservation from "@/components/court-reservation/admin-court-reservation";
import { isAdminRole } from "@/lib/roles";
import { SportShoe } from "lucide-react";

export default function CourtReservationPage() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        icon={SportShoe}
        title="Court Reservation"
        description="Request and track your court reservation."
      />
      {isAdmin ? <AdminCourtReservation /> : <ResidentCourtReservation />}
    </div>
  );
}