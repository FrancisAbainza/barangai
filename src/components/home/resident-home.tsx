"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ResidentCredentialsBanner from "@/components/resident-credentials-banner";
import WelcomeBanner from "@/components/home/welcome-banner";
import QuickActionTiles from "@/components/home/quick-action-tiles";
import MyActivityStrip from "@/components/home/my-activity-strip";
import LatestNewsSection from "@/components/home/latest-news-section";
import { getResidentProfile } from "@/actions/resident-profile";

export default function ResidentHome() {
  const { user } = useUser();
  const { data: residentProfile, isLoading: isResidentProfileLoading } = useQuery({
    queryKey: ["resident-profile", user?.id],
    queryFn: () => getResidentProfile(user!.id),
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6">
      <WelcomeBanner />
      <QuickActionTiles />
      <MyActivityStrip />
      <LatestNewsSection />

      {isResidentProfileLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        !residentProfile && (
          <ResidentCredentialsBanner
            userId={user?.id}
            description="Complete your Resident Credentials to unlock document requests and other barangay services."
          />
        )
      )}
    </div>
  );
}
