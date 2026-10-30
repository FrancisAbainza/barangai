import type { User } from "@clerk/nextjs/server";
import ProfileHeader from "@/components/profile/profile-header";
import ResidentProfileView from "@/components/profile/resident-profile-view";
import ResidentCredentialsMissing from "@/components/profile/resident-credentials-missing";
import ProfileTabs from "@/components/profile/profile-tabs";
import type { ResidentProfile } from "@/db/schema";

interface OtherProfileViewProps {
  profileUser: User;
  residentProfile: ResidentProfile | null;
}

export default function OtherProfileView({ profileUser, residentProfile }: OtherProfileViewProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Only admins can view another user's profile, so the actions menu is always theirs to use. */}
      <ProfileHeader profileUser={profileUser} showActions />

      {residentProfile ? (
        <ResidentProfileView profile={residentProfile} />
      ) : (
        <ResidentCredentialsMissing />
      )}

      <ProfileTabs userId={profileUser.id} />
    </div>
  );
}
