import Image from "next/image";
import type { User } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/roles";

export default function ProfileHeader({ profileUser }: { profileUser: User }) {
  const fullName =
    [profileUser.firstName, profileUser.lastName].filter(Boolean).join(" ") ||
    profileUser.username ||
    "Unknown";
  const profileRole =
    (profileUser.publicMetadata?.role as string | undefined) ?? "resident";

  return (
    <div className="flex items-center gap-4">
      <Image
        src={profileUser.imageUrl}
        alt={fullName}
        width={80}
        height={80}
        className="size-20 shrink-0 rounded-full object-cover"
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profileUser.emailAddresses[0]?.emailAddress}
        </p>
        <Badge
          variant={profileRole === "admin" ? "default" : "secondary"}
          className="mt-2 capitalize"
        >
          {roleLabel(profileRole)}
        </Badge>
      </div>
    </div>
  );
}
