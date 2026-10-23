"use client";

import { useEffect, useState } from "react";
import { Map, MapPinOff, MessageSquareWarning, Table as TableIcon } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyState from "@/components/empty-state";
import LoadMoreTrigger from "@/components/load-more-trigger";
import ComplaintActionsMenu from "@/components/complaint/complaint-actions-menu";
import ComplaintsMapView from "@/components/complaint/complaints-map-view";
import ViewComplaintDialog from "@/components/complaint/dialogs/view-complaint-dialog";
import { useViewParam } from "@/hooks/use-view-param";
import { getComplaintById, getMyComplaints } from "@/actions/complaints";
import {
  statusBadgeVariant,
  priorityBadgeVariant,
  formatDate,
  formatReferenceNumber,
  otherResidentsLabel,
} from "@/lib/complaints";

export default function MyComplaintsTable() {
  const [view, setView] = useState<"table" | "map">("table");

  // `?view=<id>` (set by clicking a row, or by links like a notification) opens that submission's
  // Submission Info dialog. It's fetched by id since it may not be in the loaded list.
  const [viewId, setViewId] = useViewParam();
  const { data: fetchedComplaint } = useQuery({
    queryKey: ["complaints", "view", viewId],
    queryFn: () => getComplaintById(viewId!),
    enabled: viewId !== null,
  });

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["complaints"],
    queryFn: ({ pageParam }) => getMyComplaints({ offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const myComplaints = data?.pages.flatMap((page) => page.items) ?? [];
  // A clicked row is already loaded, so its dialog opens without waiting on that fetch.
  const viewedComplaint = myComplaints.find((complaint) => complaint.id === viewId) ?? fetchedComplaint;

  // The map should plot every complaint, not just the first page, so keep
  // paging through the same infinite query once the resident switches to the map tab.
  useEffect(() => {
    if (view === "map" && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [view, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">My Complaints</h2>

      <Tabs value={view} onValueChange={(value) => setView(value as "table" | "map")}>
        <TabsList>
          <TabsTrigger value="table">
            <TableIcon />
            Table
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map />
            Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="pt-2">
          {!isLoading && myComplaints.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title="No complaints filed yet"
              description="Complaints you file or follow will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm [&_thead]:bg-muted/50 [&_th]:text-muted-foreground">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference No.</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {myComplaints.map((complaint) => (
                        <TableRow key={complaint.id} className="cursor-pointer" onClick={() => setViewId(complaint.id)}>
                          <TableCell className="font-medium">{formatReferenceNumber(complaint.id)}</TableCell>
                          <TableCell>
                            <p className="font-medium">{complaint.subject}</p>
                            {complaint.isFollowing ? (
                              <p className="text-xs text-muted-foreground">Reported by another resident</p>
                            ) : (
                              complaint.followerCount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Also reported by {otherResidentsLabel(complaint.followerCount)}
                                </p>
                              )
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{complaint.category}</TableCell>
                          <TableCell>
                            <Badge variant={priorityBadgeVariant(complaint.priority)}>
                              {complaint.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(complaint.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(complaint.status)}>{complaint.status}</Badge>
                          </TableCell>
                          {/* Clicks in the menu (and its portaled dialogs) bubble to the row, which would open its dialog too. */}
                          <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                            <ComplaintActionsMenu complaint={complaint} />
                          </TableCell>
                        </TableRow>
                      ))}
                      {hasNextPage && (
                        <LoadMoreTrigger
                          colSpan={7}
                          onIntersect={fetchNextPage}
                          disabled={isFetchingNextPage}
                        />
                      )}
                      {isFetchingNextPage && (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="pt-2">
          {isLoading || (isFetchingNextPage && hasNextPage) ? (
            <Skeleton className="h-128 w-full rounded-lg" />
          ) : myComplaints.length === 0 ? (
            <EmptyState
              icon={MapPinOff}
              title="No complaints to display"
              description="File a complaint to see it plotted on the map."
              className="h-128"
            />
          ) : (
            <ComplaintsMapView complaints={myComplaints} />
          )}
        </TabsContent>
      </Tabs>

      {viewedComplaint && viewId !== null && (
        <ViewComplaintDialog complaint={viewedComplaint} open onOpenChange={(open) => !open && setViewId(null)} />
      )}
    </div>
  );
}
