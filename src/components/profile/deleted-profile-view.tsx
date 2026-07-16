import { UserX } from "lucide-react";
import ResidentProfileView from "@/components/profile/resident-profile-view";
import ResidentCredentialsMissing from "@/components/profile/resident-credentials-missing";
import ProfileTabs from "@/components/profile/profile-tabs";
import type { ResidentProfile } from "@/db/schema";

interface DeletedProfileViewProps {
  profileUserId: string;
  residentProfile: ResidentProfile | null;
}

export default function DeletedProfileView({
  profileUserId,
  residentProfile,
}: DeletedProfileViewProps) {
  return (
    <div className="container space-y-6 m-auto">
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserX className="size-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-muted-foreground">
            Deleted User
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            This account has been deleted. Their records are still shown below.
          </p>
        </div>
      </div>

      {residentProfile ? (
        <ResidentProfileView profile={residentProfile} />
      ) : (
        <ResidentCredentialsMissing />
      )}

      <ProfileTabs userId={profileUserId} />
    </div>
  );
}
