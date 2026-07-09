"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, ListChecks, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setComplaintStatus, type ComplaintWithComplainant } from "@/actions/complaints";
import { complaintStatusEnum, type Complaint } from "@/db/schema";
import type { MediaItem } from "@/components/file-uploader";
import { deleteFile } from "@/lib/storage";
import AdminViewComplaintDialog from "@/components/complaint/dialogs/admin-view-complaint-dialog";
import AdminDeleteComplaintDialog from "@/components/complaint/dialogs/admin-delete-complaint-dialog";
import AdminResolveComplaintDialog from "@/components/complaint/dialogs/admin-resolve-complaint-dialog";
import AdminDismissComplaintDialog from "@/components/complaint/dialogs/admin-dismiss-complaint-dialog";

export default function AdminComplaintActionsMenu({
  complaint,
}: {
  complaint: ComplaintWithComplainant;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: changeStatus, isPending: isChangingStatus } = useMutation({
    mutationFn: async (status: Complaint["status"]) => {
      if (complaint.status === "Resolved" && status !== "Resolved") {
        const resolutionAttachments = complaint.resolutionAttachments as MediaItem[];
        const keys = resolutionAttachments.map((item) => item.key).filter(Boolean) as string[];
        await Promise.all(keys.map((key) => deleteFile(key)));
      }
      if (complaint.status === "Dismissed" && status !== "Dismissed") {
        const dismissalAttachments = complaint.dismissalAttachments as MediaItem[];
        const keys = dismissalAttachments.map((item) => item.key).filter(Boolean) as string[];
        await Promise.all(keys.map((key) => deleteFile(key)));
      }
      await setComplaintStatus(complaint.id, status);
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success(`Complaint marked as ${status}.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status. Please try again.");
    },
  });

  function handleStatusSelect(status: Complaint["status"]) {
    if (status === "Resolved") {
      setResolveOpen(true);
      return;
    }
    if (status === "Dismissed") {
      setDismissOpen(true);
      return;
    }
    changeStatus(status);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setViewOpen(true)}>
            <Eye />
            View
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ListChecks />
              Set status
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {complaintStatusEnum.enumValues.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    disabled={status === complaint.status || isChangingStatus}
                    onSelect={() => handleStatusSelect(status)}
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete complaint
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminViewComplaintDialog complaint={complaint} open={viewOpen} onOpenChange={setViewOpen} />
      <AdminDeleteComplaintDialog complaint={complaint} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <AdminResolveComplaintDialog complaint={complaint} open={resolveOpen} onOpenChange={setResolveOpen} />
      <AdminDismissComplaintDialog complaint={complaint} open={dismissOpen} onOpenChange={setDismissOpen} />
    </>
  );
}
