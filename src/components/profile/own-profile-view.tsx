import type { User } from "@clerk/nextjs/server";
import ProfileHeader from "@/components/profile/profile-header";
import ResidentProfileSection from "@/components/profile/resident-profile-section";
import ProfileTabs from "@/components/profile/profile-tabs";
import type { MediaItem } from "@/components/file-uploader";
import { VALID_ID_TYPES } from "@/schemas/resident-profile-schema";
import type { ResidentProfile } from "@/db/schema";

interface OwnProfileViewProps {
  profileUser: User;
  residentProfile: ResidentProfile | null;
}

export default function OwnProfileView({
  profileUser,
  residentProfile,
}: OwnProfileViewProps) {
  return (
    <div className="container space-y-6 m-auto">
      <ProfileHeader profileUser={profileUser} />

      <ResidentProfileSection
        userId={profileUser.id}
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

      <ProfileTabs userId={profileUser.id} />
    </div>
  );
}
