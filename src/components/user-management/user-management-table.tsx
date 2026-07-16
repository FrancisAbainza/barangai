"use client";

import { ShieldCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserStats } from "@/actions/user-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/stat-card";
import ActiveUsersTable from "@/components/user-management/active-users-table";
import DeletedUsersTable from "@/components/user-management/deleted-users-table";

export default function UserManagementTable() {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["users", "stats"],
    queryFn: () => getUserStats(),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2">
        <StatCard
          label="Residents"
          value={stats?.residents ?? 0}
          description="Registered residents"
          icon={Users}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Admins"
          value={stats?.admins ?? 0}
          description="Admins and super admins"
          icon={ShieldCheck}
          isLoading={isStatsLoading}
          iconClassName="bg-violet-500/10 text-violet-600"
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="deleted">Deleted Users</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 pt-2">
          <ActiveUsersTable />
        </TabsContent>

        <TabsContent value="deleted" className="pt-2">
          <DeletedUsersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
