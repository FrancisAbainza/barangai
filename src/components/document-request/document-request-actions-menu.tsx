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
import type { DocumentRequest } from "@/db/schema";
import ViewDocumentRequestDialog from "./dialogs/view-document-request-dialog";
import DeleteDocumentRequestDialog from "./dialogs/delete-document-request-dialog";

export default function DocumentRequestActionsMenu({ request }: { request: DocumentRequest }) {
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

      <ViewDocumentRequestDialog request={request} open={viewOpen} onOpenChange={setViewOpen} />
      <DeleteDocumentRequestDialog request={request} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
