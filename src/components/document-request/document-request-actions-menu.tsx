"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
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
import { setDocumentRequestStatus, type DocumentRequestWithRequester } from "@/actions/document-requests";
import { documentRequestStatusEnum, type DocumentRequest } from "@/db/schema";
import { isAdminRole } from "@/lib/roles";
import { deleteFile } from "@/lib/storage";
import type { MediaItem } from "@/components/file-uploader";
import ViewDocumentRequestDialog from "@/components/document-request/dialogs/view-document-request-dialog";
import DeleteDocumentRequestDialog from "@/components/document-request/dialogs/delete-document-request-dialog";
import AdminReadyForPickupDialog from "@/components/document-request/dialogs/admin-ready-for-pickup-dialog";
import AdminRejectDocumentRequestDialog from "@/components/document-request/dialogs/admin-reject-document-request-dialog";

export default function DocumentRequestActionsMenu({
  request,
}: {
  request: DocumentRequestWithRequester;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [readyForPickupOpen, setReadyForPickupOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const queryClient = useQueryClient();

  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);
  const isOwnRequest = request.requesterId === user?.id;

  const { mutate: changeStatus, isPending: isChangingStatus } = useMutation({
    mutationFn: async (status: DocumentRequest["status"]) => {
      if (request.status === "Ready for Pickup" && status !== "Ready for Pickup") {
        const pickupAttachments = request.pickupAttachments as MediaItem[];
        const keys = pickupAttachments.map((item) => item.key).filter(Boolean) as string[];
        await Promise.all(keys.map((key) => deleteFile(key)));
      }
      if (request.status === "Rejected" && status !== "Rejected") {
        const rejectionAttachments = request.rejectionAttachments as MediaItem[];
        const keys = rejectionAttachments.map((item) => item.key).filter(Boolean) as string[];
        await Promise.all(keys.map((key) => deleteFile(key)));
      }
      await setDocumentRequestStatus(request.id, status);
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      toast.success(`Request marked as ${status}.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status. Please try again.");
    },
  });

  function handleStatusSelect(status: DocumentRequest["status"]) {
    if (status === "Ready for Pickup") {
      setReadyForPickupOpen(true);
      return;
    }
    if (status === "Rejected") {
      setRejectOpen(true);
      return;
    }
    changeStatus(status);
  }

  if (!isAdmin && !isOwnRequest) return null;

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

          {isAdmin && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ListChecks />
                Set status
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {documentRequestStatusEnum.enumValues.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      disabled={status === request.status || isChangingStatus}
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
            Delete request
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ViewDocumentRequestDialog request={request} open={viewOpen} onOpenChange={setViewOpen} />
      <DeleteDocumentRequestDialog request={request} open={deleteOpen} onOpenChange={setDeleteOpen} />
      {isAdmin && (
        <>
          <AdminReadyForPickupDialog
            request={request}
            open={readyForPickupOpen}
            onOpenChange={setReadyForPickupOpen}
          />
          <AdminRejectDocumentRequestDialog request={request} open={rejectOpen} onOpenChange={setRejectOpen} />
        </>
      )}
    </>
  );
}
