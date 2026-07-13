"use client";

import { useUser } from "@clerk/nextjs";
import PageHeader from "@/components/page-header";
import ResidentHome from "@/components/home/resident-home";
import AdminHome from "@/components/home/admin-home";
import { isAdminRole } from "@/lib/roles";
import { Home } from "lucide-react";

export default function HomePage() {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Home}
        title="Home"
        description={`Access barangay services and facilities.`}
        className="hidden sm:block"
      />
      {isAdmin ? <AdminHome /> : <ResidentHome />}
    </div>
  );
}