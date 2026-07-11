"use client";

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
import LoadMoreTrigger from "@/components/load-more-trigger";
import BusinessActionsMenu from "@/components/community-hub/business-actions-menu";
import { statusBadgeVariant, formatDate } from "@/lib/business";
import type { BusinessWithOwner } from "@/actions/business";

const COLUMN_COUNT = 6;

function SubmissionRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-8 rounded-md ml-auto" />
      </TableCell>
    </TableRow>
  );
}

interface BusinessSubmissionsTableProps {
  businesses: BusinessWithOwner[];
  isLoading: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}

export default function BusinessSubmissionsTable({
  businesses,
  isLoading,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: BusinessSubmissionsTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <>
              <SubmissionRowSkeleton />
              <SubmissionRowSkeleton />
              <SubmissionRowSkeleton />
            </>
          ) : businesses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMN_COUNT} className="text-center text-sm text-muted-foreground py-8">
                No submissions found.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {businesses.map((business) => (
                <TableRow key={business.id}>
                  <TableCell>
                    <p className="font-medium truncate">{business.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{business.ownerName}</p>
                  </TableCell>
                  <TableCell>{business.category}</TableCell>
                  <TableCell className="text-muted-foreground">{business.contactNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(business.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(business.status)}>{business.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <BusinessActionsMenu business={business} />
                  </TableCell>
                </TableRow>
              ))}
              {hasNextPage && (
                <LoadMoreTrigger
                  colSpan={COLUMN_COUNT}
                  onIntersect={fetchNextPage}
                  disabled={isFetchingNextPage}
                />
              )}
              {isFetchingNextPage && <SubmissionRowSkeleton />}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
