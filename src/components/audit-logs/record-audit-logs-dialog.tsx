"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronRight, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import ViewAuditLogDialog from "@/components/audit-logs/view-audit-log-dialog";
import { getAuditLogs } from "@/actions/audit-logs";
import type { AuditLogWithActor } from "@/lib/audit";
import { AUDIT_ACTION_LABELS, auditActionBadgeVariant, type AuditEntityType } from "@/lib/audit-logs";
import { roleLabel } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";

interface RecordAuditLogsDialogProps {
  entityType: AuditEntityType;
  entityId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Rendered inside DialogContent, which unmounts while closed, so it only fetches once opened.
function RecordAuditLogList({ entityType, entityId }: Pick<RecordAuditLogsDialogProps, "entityType" | "entityId">) {
  const [viewedLog, setViewedLog] = useState<AuditLogWithActor | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["audit-logs", "record", entityType, entityId],
    queryFn: ({ pageParam }) => getAuditLogs({ offset: pageParam, entityType, entityId }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    // Refetched on every open, since the record's own mutations don't invalidate its audit logs.
    staleTime: 0,
  });

  const logs = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No audit logs yet"
        description="Changes admins make to this record will appear here."
      />
    );
  }

  return (
    <>
      <div className="space-y-2">
        {logs.map((log) => (
          <button
            key={log.id}
            type="button"
            onClick={() => setViewedLog(log)}
            className="group flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left outline-none transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={auditActionBadgeVariant(log.action)}>{AUDIT_ACTION_LABELS[log.action]}</Badge>
                <span className="text-xs text-muted-foreground">{formatDateTime(new Date(log.createdAt))}</span>
              </div>
              <p className="text-sm">{log.summary}</p>
              <p className="truncate text-xs text-muted-foreground">
                {log.actorName} · {roleLabel(log.actorRole)}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>

      {viewedLog && (
        <ViewAuditLogDialog
          log={viewedLog}
          open
          onOpenChange={(open) => !open && setViewedLog(null)}
          showRecordLink={false}
        />
      )}
    </>
  );
}

// One record's entries from the super admins' Audit Logs, opened from its actions menu.
export default function RecordAuditLogsDialog({ entityType, entityId, open, onOpenChange }: RecordAuditLogsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Logs</DialogTitle>
          <DialogDescription>
            Changes admins have made to this record, newest first. Select one to see its details.
          </DialogDescription>
        </DialogHeader>
        <RecordAuditLogList entityType={entityType} entityId={entityId} />
      </DialogContent>
    </Dialog>
  );
}
