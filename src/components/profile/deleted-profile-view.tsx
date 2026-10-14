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
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted ring-4 ring-border">
          <UserX className="size-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-muted-foreground sm:text-3xl">
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
