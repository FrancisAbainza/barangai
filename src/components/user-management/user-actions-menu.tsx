"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  ShieldMinus,
  ShieldPlus,
  Trash2,
  UserRound,
} from "lucide-react";
import { updateUserRole } from "@/actions/user-management";
import { isSuperAdminRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BanUserDialog from "@/components/user-management/ban-user-dialog";
import DeleteUserDialog from "@/components/user-management/delete-user-dialog";

interface UserActionsMenuProps {
  userId: string;
  userName: string;
  role: string;
  isBanned: boolean;
}

export default function UserActionsMenu({
  userId,
  userName,
  role,
  isBanned,
}: UserActionsMenuProps) {
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useUser();
  const isSuperAdmin = isSuperAdminRole(user?.publicMetadata?.role as string | undefined);

  const { mutate: changeRole, isPending: isChangingRole } = useMutation({
    mutationFn: (newRole: "admin" | "superadmin" | null) => updateUserRole(userId, newRole),
    onSuccess: (_data, newRole) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      const label =
        newRole === "admin" ? "an Admin" : newRole === "superadmin" ? "a Super Admin" : "a Resident";
      toast.success(`${userName} is now ${label}.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    },
  });

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
          <DropdownMenuItem asChild>
            <Link href={`/portal/profile/${userId}`}>
              <UserRound />
              View Profile
            </Link>
          </DropdownMenuItem>
          {isSuperAdmin && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Shield />
                  Role
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      disabled={role === "admin" || isChangingRole}
                      onSelect={() => changeRole("admin")}
                    >
                      <ShieldCheck />
                      Set as Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={role === "superadmin" || isChangingRole}
                      onSelect={() => changeRole("superadmin")}
                    >
                      <ShieldPlus />
                      Set as Super Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={role === "resident" || isChangingRole}
                      onSelect={() => changeRole(null)}
                    >
                      <ShieldMinus />
                      Set as Resident
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setBanDialogOpen(true);
            }}
          >
            <Ban />
            {isBanned ? "Unban User" : "Ban User"}
          </DropdownMenuItem>
          {isSuperAdmin && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 />
              Delete User
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <BanUserDialog
        userId={userId}
        userName={userName}
        isBanned={isBanned}
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
      />
      <DeleteUserDialog
        userId={userId}
        userName={userName}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
