"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, ListChecks, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { setBusinessStatus, type BusinessWithOwner } from "@/actions/business";
import { businessStatusEnum, type Business } from "@/db/schema";
import { isAdminRole } from "@/lib/roles";
import { deleteFile } from "@/lib/storage";
import ViewSubmissionDialog from "@/components/community-hub/dialogs/view-submission-dialog";
import EditBusinessDialog from "@/components/community-hub/dialogs/edit-business-dialog";
import DeleteBusinessDialog from "@/components/community-hub/dialogs/delete-business-dialog";
import RejectBusinessDialog from "@/components/community-hub/dialogs/reject-business-dialog";
import type { MediaItem } from "@/components/file-uploader";

export default function BusinessActionsMenu({ business }: { business: BusinessWithOwner }) {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const queryClient = useQueryClient();

  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);
  const isOwnBusiness = business.ownerId === user?.id;

  const { mutate: changeStatus, isPending: isChangingStatus } = useMutation({
    mutationFn: async (status: Business["status"]) => {
      if (business.status === "Rejected" && status !== "Rejected") {
        const rejectionAttachments = business.rejectionAttachments as MediaItem[];
        const keys = rejectionAttachments.map((item) => item.key).filter(Boolean) as string[];
        await Promise.all(keys.map((key) => deleteFile(key)));
      }
      await setBusinessStatus(business.id, status);
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success(`Business marked as ${status}.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status. Please try again.");
    },
  });

  function handleStatusSelect(status: Business["status"]) {
    if (status === "Rejected") {
      setRejectOpen(true);
      return;
    }
    changeStatus(status);
  }

  if (!isAdmin && !isOwnBusiness) return null;

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
          {(isAdmin || isOwnBusiness) && (
            <DropdownMenuItem onSelect={() => setViewOpen(true)}>
              <Eye />
              Submission Info
            </DropdownMenuItem>
          )}

          {isOwnBusiness && (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              Edit
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
                  {businessStatusEnum.enumValues.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={status === business.status || isChangingStatus}
                      onSelect={() => handleStatusSelect(status)}
                    >
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete business
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {(isAdmin || isOwnBusiness) && (
        <ViewSubmissionDialog business={business} open={viewOpen} onOpenChange={setViewOpen} />
      )}
      {isOwnBusiness && (
        <EditBusinessDialog business={business} open={editOpen} onOpenChange={setEditOpen} />
      )}
      <DeleteBusinessDialog business={business} open={deleteOpen} onOpenChange={setDeleteOpen} />
      {isAdmin && <RejectBusinessDialog business={business} open={rejectOpen} onOpenChange={setRejectOpen} />}
    </>
  );
}
