"use client";

import { useState } from "react";
import { Eye, FileText, Megaphone, MessageSquareWarning, ScrollText, SportShoe, Store } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserDocumentRequestsTable from "@/components/profile/user-document-requests-table";
import UserBusinessesTable from "@/components/profile/user-businesses-table";
import UserCourtReservationsTable from "@/components/profile/user-court-reservations-table";
import UserComplaintsTable from "@/components/profile/user-complaints-table";
import AuditLogsTable from "@/components/audit-logs/audit-logs-table";
import NewsList from "@/components/news/news-list";
import TransparencyProjectList from "@/components/transparency/transparency-project-list";

type RequestsTab =
  | "document-requests"
  | "community-hub"
  | "court-reservation"
  | "complaints"
  | "news"
  | "transparency"
  | "audit-logs";

interface ProfileTabsProps {
  userId: string;
  // Admins only submit businesses and court reservations, so their profile shows just those,
  // plus the news posts and transparency projects they've published.
  isAdmin?: boolean;
  // The admin's own actions, which only they and super admins can see.
  showAuditLogs?: boolean;
}

// Labels show from `lg`: below that, the portal sidebar leaves too little room for them.
export default function ProfileTabs({ userId, isAdmin = false, showAuditLogs = false }: ProfileTabsProps) {
  const [tab, setTab] = useState<RequestsTab>(isAdmin ? "community-hub" : "document-requests");

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as RequestsTab)}>
      <TabsList>
        {!isAdmin && (
          <TabsTrigger value="document-requests" aria-label="Document Request">
            <FileText />
            <span className="hidden lg:inline">Document Request</span>
          </TabsTrigger>
        )}
        <TabsTrigger value="community-hub" aria-label="Community Hub">
          <Store />
          <span className="hidden lg:inline">Community Hub</span>
        </TabsTrigger>
        <TabsTrigger value="court-reservation" aria-label="Court Reservation">
          <SportShoe />
          <span className="hidden lg:inline">Court Reservation</span>
        </TabsTrigger>
        {!isAdmin && (
          <TabsTrigger value="complaints" aria-label="Complaint">
            <MessageSquareWarning />
            <span className="hidden lg:inline">Complaint</span>
          </TabsTrigger>
        )}
        {isAdmin && (
          <>
            <TabsTrigger value="news" aria-label="News & Announcements">
              <Megaphone />
              <span className="hidden lg:inline">News</span>
            </TabsTrigger>
            <TabsTrigger value="transparency" aria-label="Transparency">
              <Eye />
              <span className="hidden lg:inline">Transparency</span>
            </TabsTrigger>
          </>
        )}
        {showAuditLogs && (
          <TabsTrigger value="audit-logs" aria-label="Audit Logs">
            <ScrollText />
            <span className="hidden lg:inline">Audit Logs</span>
          </TabsTrigger>
        )}
      </TabsList>

      {!isAdmin && (
        <TabsContent value="document-requests" className="space-y-2 pt-2">
          <h2 className="text-lg font-semibold lg:hidden">Document Request</h2>
          <UserDocumentRequestsTable userId={userId} />
        </TabsContent>
      )}
      <TabsContent value="community-hub" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold lg:hidden">Community Hub</h2>
        <UserBusinessesTable userId={userId} />
      </TabsContent>
      <TabsContent value="court-reservation" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold lg:hidden">Court Reservation</h2>
        <UserCourtReservationsTable userId={userId} />
      </TabsContent>
      {!isAdmin && (
        <TabsContent value="complaints" className="space-y-2 pt-2">
          <h2 className="text-lg font-semibold lg:hidden">Complaint</h2>
          <UserComplaintsTable userId={userId} />
        </TabsContent>
      )}
      {isAdmin && (
        <>
          <TabsContent value="news" className="space-y-2 pt-2">
            <h2 className="text-lg font-semibold lg:hidden">News & Announcements</h2>
            <NewsList authorId={userId} />
          </TabsContent>
          <TabsContent value="transparency" className="space-y-2 pt-2">
            <h2 className="text-lg font-semibold lg:hidden">Transparency</h2>
            <TransparencyProjectList authorId={userId} />
          </TabsContent>
        </>
      )}
      {showAuditLogs && (
        <TabsContent value="audit-logs" className="space-y-2 pt-2">
          <h2 className="text-lg font-semibold lg:hidden">Audit Logs</h2>
          <AuditLogsTable actorId={userId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
