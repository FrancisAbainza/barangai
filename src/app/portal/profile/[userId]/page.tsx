import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import OwnProfileView from "@/components/profile/own-profile-view";
import OtherProfileView from "@/components/profile/other-profile-view";
import DeletedProfileView from "@/components/profile/deleted-profile-view";
import { getResidentProfile } from "@/actions/resident-profile";
import { getAuthRole } from "@/lib/auth";

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
  // The profile owner may have since been deleted from Clerk (e.g. via user-management),
  // so look up by list instead of `getUser`, which throws on a miss.
  const { data: matches } = await client.users.getUserList({ userId: [profileUserId] });
  const profileUser = matches[0] ?? null;
  const residentProfile = await getResidentProfile(profileUserId);

  if (!profileUser) {
    return <DeletedProfileView profileUserId={profileUserId} residentProfile={residentProfile} />;
  }

  if (userId !== profileUserId) {
    return <OtherProfileView profileUser={profileUser} residentProfile={residentProfile} />;
  }

  return (
    <OwnProfileView profileUser={profileUser} residentProfile={residentProfile} />
  );
}
