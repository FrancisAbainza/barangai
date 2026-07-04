import { Users } from "lucide-react";
import PageHeader from "@/components/page-header";
import UserManagementTable from "@/components/user-management/user-management-table";

export default function UserManagementPage() {
  return (
    <div className="container space-y-6 m-auto">
      <PageHeader
        icon={Users}
        title="User Management"
        description="Manage users, roles, and permissions"
      />
      <UserManagementTable />
    </div>
  );
}
