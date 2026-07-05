"use client";

import type { ReactNode } from "react";
import { UserRoundX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getOfficials, type OfficialSection } from "@/actions/officials";
import OfficialCard from "./official-card";
import AddOfficialDialog from "./add-official-dialog";

interface OfficialsGridProps {
  title: string;
  icon: ReactNode;
  addLabel: string;
  section: OfficialSection;
  isAdmin: boolean;
}

function OfficialCardSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-lg border p-4 ${featured ? "p-6" : "p-4"}`}>
      <Skeleton className={`rounded-full ${featured ? "size-24" : "size-16"}`} />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export default function OfficialsGrid({ title, icon, addLabel, section, isAdmin }: OfficialsGridProps) {
  const { data: officials, isLoading } = useQuery({
    queryKey: ["officials", section],
    queryFn: () => getOfficials(section),
  });

  const leader = officials?.find((official) => official.isLeader);
  const members = officials?.filter((official) => !official.isLeader) ?? [];
  const hasLeader = !!leader;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="rounded-md bg-accent p-2 text-primary [&_svg]:size-5">{icon}</div>
        <div className="flex-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>
            {officials?.length ?? 0} {officials?.length === 1 ? "official" : "officials"}
          </CardDescription>
        </div>
        {isAdmin && <AddOfficialDialog title={title} addLabel={addLabel} section={section} hasLeader={hasLeader} />}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <OfficialCardSkeleton featured />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <OfficialCardSkeleton />
              <OfficialCardSkeleton />
              <OfficialCardSkeleton />
            </div>
          </div>
        ) : !officials?.length ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-muted-foreground">
            <UserRoundX className="size-8" />
            <p className="text-sm">No officials added yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leader && <OfficialCard official={leader} isAdmin={isAdmin} hasLeader={hasLeader} />}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((official) => (
                <OfficialCard key={official.id} official={official} isAdmin={isAdmin} hasLeader={hasLeader} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
