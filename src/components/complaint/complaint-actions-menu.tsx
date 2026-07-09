"use client";

import { useState } from "react";
import { Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Complaint } from "@/db/schema";
import ViewComplaintDialog from "./dialogs/view-complaint-dialog";
import DeleteComplaintDialog from "./dialogs/delete-complaint-dialog";

export default function ComplaintActionsMenu({ complaint }: { complaint: Complaint }) {
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ViewComplaintDialog complaint={complaint} open={viewOpen} onOpenChange={setViewOpen} />
      <DeleteComplaintDialog complaint={complaint} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
