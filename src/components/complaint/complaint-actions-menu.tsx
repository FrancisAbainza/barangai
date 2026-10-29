"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, ListChecks, ListX, MoreHorizontal, ScrollText, Trash2 } from "lucide-react";
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
import { setComplaintStatus, unfollowComplaint, type ComplaintWithComplainant } from "@/actions/complaints";
import { complaintStatusEnum, type Complaint } from "@/db/schema";
import { isAdminRole, isSuperAdminRole } from "@/lib/roles";
import { deleteFile } from "@/lib/storage";
import type { MediaItem } from "@/components/file-uploader";
import ViewComplaintDialog from "@/components/complaint/dialogs/view-complaint-dialog";
import DeleteComplaintDialog from "@/components/complaint/dialogs/delete-complaint-dialog";
import AdminResolveComplaintDialog from "@/components/complaint/dialogs/admin-resolve-complaint-dialog";
import AdminDismissComplaintDialog from "@/components/complaint/dialogs/admin-dismiss-complaint-dialog";
import RecordAuditLogsDialog from "@/components/audit-logs/record-audit-logs-dialog";

export default function ComplaintActionsMenu({
  complaint,
}: {
  complaint: ComplaintWithComplainant;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);
  const isSuperAdmin = isSuperAdminRole(user?.publicMetadata?.role as string | undefined);
  const isOwnComplaint = complaint.complainantId === user?.id;

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

  const { mutate: unfollow, isPending: isUnfollowing } = useMutation({
    mutationFn: () => unfollowComplaint(complaint.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint removed from My Complaints.");
    },
    onError: () => {
      toast.error("Failed to remove the complaint. Please try again.");
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

  if (!isAdmin && !isOwnComplaint && !complaint.isFollowing) return null;

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
            Submission Info
          </DropdownMenuItem>

          {isSuperAdmin && (
            <DropdownMenuItem onSelect={() => setAuditLogsOpen(true)}>
              <ScrollText />
              Audit Logs
            </DropdownMenuItem>
          )}

          {isAdmin && (
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
          )}

          {/* Residents can't delete a complaint others follow, since it'd vanish from their My Complaints. */}
          {(isAdmin || (isOwnComplaint && complaint.status === "Pending" && complaint.followerCount === 0)) && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete complaint
            </DropdownMenuItem>
          )}

          {complaint.isFollowing && (
            <DropdownMenuItem variant="destructive" disabled={isUnfollowing} onSelect={() => unfollow()}>
              <ListX />
              Remove from My Complaints
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ViewComplaintDialog complaint={complaint} open={viewOpen} onOpenChange={setViewOpen} />
      <DeleteComplaintDialog complaint={complaint} open={deleteOpen} onOpenChange={setDeleteOpen} />
      {isAdmin && (
        <>
          <AdminResolveComplaintDialog complaint={complaint} open={resolveOpen} onOpenChange={setResolveOpen} />
          <AdminDismissComplaintDialog complaint={complaint} open={dismissOpen} onOpenChange={setDismissOpen} />
        </>
      )}
      {isSuperAdmin && (
        <RecordAuditLogsDialog
          entityType="complaint"
          entityId={complaint.id}
          open={auditLogsOpen}
          onOpenChange={setAuditLogsOpen}
        />
      )}
    </>
  );
}
