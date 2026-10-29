import { ScrollText } from "lucide-react";
import PageHeader from "@/components/page-header";
import AuditLogsTable from "@/components/audit-logs/audit-logs-table";

export default function AuditLogsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        icon={ScrollText}
        title="Audit Logs"
        description="A record of the changes admins make in the portal"
      />
      <AuditLogsTable />
    </div>
  );
}
