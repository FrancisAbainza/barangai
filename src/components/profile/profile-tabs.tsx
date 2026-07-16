"use client";

import { useState } from "react";
import { FileText, MessageSquareWarning, SportShoe, Store } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserDocumentRequestsTable from "@/components/profile/user-document-requests-table";
import UserBusinessesTable from "@/components/profile/user-businesses-table";
import UserCourtReservationsTable from "@/components/profile/user-court-reservations-table";
import UserComplaintsTable from "@/components/profile/user-complaints-table";

type RequestsTab = "document-requests" | "community-hub" | "court-reservation" | "complaints";

export default function ProfileTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<RequestsTab>("document-requests");

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as RequestsTab)}>
      <TabsList>
        <TabsTrigger value="document-requests" aria-label="Document Request">
          <FileText />
          <span className="hidden sm:inline">Document Request</span>
        </TabsTrigger>
        <TabsTrigger value="community-hub" aria-label="Community Hub">
          <Store />
          <span className="hidden sm:inline">Community Hub</span>
        </TabsTrigger>
        <TabsTrigger value="court-reservation" aria-label="Court Reservation">
          <SportShoe />
          <span className="hidden sm:inline">Court Reservation</span>
        </TabsTrigger>
        <TabsTrigger value="complaints" aria-label="Complaint">
          <MessageSquareWarning />
          <span className="hidden sm:inline">Complaint</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="document-requests" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold sm:hidden">Document Request</h2>
        <UserDocumentRequestsTable userId={userId} />
      </TabsContent>
      <TabsContent value="community-hub" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold sm:hidden">Community Hub</h2>
        <UserBusinessesTable userId={userId} />
      </TabsContent>
      <TabsContent value="court-reservation" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold sm:hidden">Court Reservation</h2>
        <UserCourtReservationsTable userId={userId} />
      </TabsContent>
      <TabsContent value="complaints" className="space-y-2 pt-2">
        <h2 className="text-lg font-semibold sm:hidden">Complaint</h2>
        <UserComplaintsTable userId={userId} />
      </TabsContent>
    </Tabs>
  );
}
