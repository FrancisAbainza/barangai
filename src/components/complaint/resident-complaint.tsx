"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReportComplaintDialog from "@/components/complaint/dialogs/report-complaint-dialog";
import MyComplaintsTable from "@/components/complaint/my-complaints-table";
import ViewComplaintDialog from "@/components/complaint/dialogs/view-complaint-dialog";
import ResidentCredentialsBanner from "@/components/resident-credentials-banner";
import { getResidentProfile } from "@/actions/resident-profile";
import { getComplaintById } from "@/actions/complaints";
import { useDialogParam } from "@/hooks/use-dialog-param";
import { useViewParam } from "@/hooks/use-view-param";
import { MessageSquareWarning, Plus } from "lucide-react";

export default function ResidentComplaint() {
  const [isReportDialogOpen, setIsReportDialogOpen] = useDialogParam("report-complaint");

  // `?view=<id>` (e.g. from a notification) opens that submission's Submission Info dialog.
  // It's fetched by id since it may not be in the loaded list.
  const [viewId, setViewId] = useViewParam();
  const { data: viewedComplaint } = useQuery({
    queryKey: ["complaints", "view", viewId],
    queryFn: () => getComplaintById(viewId!),
    enabled: viewId !== null,
  });

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

      <ReportComplaintDialog open={isReportDialogOpen && hasResidentProfile} onOpenChange={setIsReportDialogOpen} />

      {viewedComplaint && viewId !== null && (
        <ViewComplaintDialog complaint={viewedComplaint} open onOpenChange={(open) => !open && setViewId(null)} />
      )}
    </>
  );
}
