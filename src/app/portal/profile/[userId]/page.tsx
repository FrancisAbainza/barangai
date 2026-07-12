import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import ResidentProfileSection from "@/components/profile/resident-profile-section";
import { getResidentProfile } from "@/actions/resident-profile";
import type { MediaItem } from "@/components/file-uploader";
import { VALID_ID_TYPES } from "@/schemas/resident-profile-schema";
import { getAuthRole } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: profileUserId } = await params;
  const { userId, isAdmin } = await getAuthRole();

  if (userId !== profileUserId && !isAdmin) {
    redirect("/portal");
  }

  const client = await clerkClient();
  const profileUser = await client.users.getUser(profileUserId);
  const fullName =
    [profileUser.firstName, profileUser.lastName].filter(Boolean).join(" ") ||
    profileUser.username ||
    "Unknown";
  const profileRole =
    (profileUser.publicMetadata?.role as string | undefined) ?? "resident";
  const residentProfile =
    userId === profileUserId ? await getResidentProfile(profileUserId) : null;

  return (
    <div className="container space-y-6 m-auto">
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

      {userId === profileUserId && (
        <ResidentProfileSection
          userId={profileUserId}
          defaultValues={{
            firstName: residentProfile?.firstName ?? profileUser.firstName ?? "",
            lastName: residentProfile?.lastName ?? profileUser.lastName ?? "",
            middleName: residentProfile?.middleName ?? "",
            birthdate: residentProfile?.birthdate ?? "",
            sex: residentProfile?.sex ?? "Male",
            civilStatus: residentProfile?.civilStatus ?? "Single",
            contactNumber: residentProfile?.contactNumber ?? "",
            address: residentProfile?.address ?? "",
            validIdType: residentProfile?.validIdType ?? VALID_ID_TYPES[0],
            validIdFront: (residentProfile?.validIdFront as MediaItem[]) ?? [],
            validIdBack: (residentProfile?.validIdBack as MediaItem[]) ?? [],
          }}
        />
      )}
    </div>
  );
}
