"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ReportComplaintDialog from "@/components/complaint/dialogs/report-complaint-dialog";
import MyComplaintsTable from "@/components/complaint/my-complaints-table";
import { MessageSquareWarning, Plus } from "lucide-react";

export default function ResidentComplaint() {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row">
        <div className="flex items-center gap-3">
          <MessageSquareWarning className="size-8 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold leading-tight">Have a concern to report?</p>
            <p className="text-sm text-muted-foreground">
              Let us know about incidents in your community so we can take action.
            </p>
          </div>
        </div>
        <Button onClick={() => setIsReportDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          File a Complaint
        </Button>
      </div>

      <MyComplaintsTable />

      <ReportComplaintDialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} />
    </>
  );
}
