import Image from "next/image";
import type { User } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import UserActionsMenu from "@/components/user-management/user-actions-menu";
import { roleLabel } from "@/lib/roles";

interface ProfileHeaderProps {
  profileUser: User;
  showActions?: boolean;
}

export default function ProfileHeader({ profileUser, showActions = false }: ProfileHeaderProps) {
  const fullName =
    [profileUser.firstName, profileUser.lastName].filter(Boolean).join(" ") ||
    profileUser.username ||
    "Unknown";
  const profileRole =
    (profileUser.publicMetadata?.role as string | undefined) ?? "resident";

  return (
    <div className="flex items-center gap-4 border-b border-border pb-6">
      <Image
        src={profileUser.imageUrl}
        alt={fullName}
        width={80}
        height={80}
        className="size-20 shrink-0 rounded-full object-cover ring-4 ring-primary/15"
      />
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{fullName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profileUser.emailAddresses[0]?.emailAddress}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge
            variant={profileRole === "admin" ? "default" : "secondary"}
            className="capitalize"
          >
            {roleLabel(profileRole)}
          </Badge>
          {profileUser.banned && <Badge variant="destructive">Banned</Badge>}
        </div>
      </div>
      {showActions && (
        <div className="ml-auto self-start">
          <UserActionsMenu
            userId={profileUser.id}
            userName={fullName}
            role={profileRole}
            isBanned={profileUser.banned}
            showViewProfile={false}
          />
        </div>
      )}
    </div>
  );
}
