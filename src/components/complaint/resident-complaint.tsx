"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReportComplaintDialog from "@/components/complaint/dialogs/report-complaint-dialog";
import MyComplaintsTable from "@/components/complaint/my-complaints-table";
import ResidentCredentialsBanner from "@/components/resident-credentials-banner";
import { getResidentProfile } from "@/actions/resident-profile";
import { MessageSquareWarning, Plus } from "lucide-react";

export default function ResidentComplaint() {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const { user } = useUser();
  const { data: residentProfile, isLoading: isResidentProfileLoading } = useQuery({
    queryKey: ["resident-profile", user?.id],
    queryFn: () => getResidentProfile(user!.id),
    enabled: !!user?.id,
  });

  const hasResidentProfile = !!residentProfile;

  return (
    <>
      {isResidentProfileLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : !hasResidentProfile ? (
        <ResidentCredentialsBanner
          userId={user?.id}
          description="You need to fill up your Resident Credentials form before you can file a complaint."
        />
      ) : (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <MessageSquareWarning className="self-center size-8 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-semibold leading-tight">Have a concern to report?</p>
              <p className="text-sm text-muted-foreground">
                Let us know about incidents in your community so we can take action.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: This is not a blotter. Use this form only for reporting non-emergency community concerns.
              </p>
            </div>
          </div>
          <Button onClick={() => setIsReportDialogOpen(true)} className="gap-2">
            <Plus className="size-4" />
            File a Complaint
          </Button>
        </div>
      )}

      <MyComplaintsTable />

      <ReportComplaintDialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} />
    </>
  );
}
