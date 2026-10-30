"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  auditActionBadgeVariant,
  getAuditLogHref,
} from "@/lib/audit-logs";
import { roleLabel } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogWithActor } from "@/lib/audit";

interface ViewAuditLogDialogProps {
  log: AuditLogWithActor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Off when opened from the record's own audit logs, which are already on its page.
  showRecordLink?: boolean;
}

export default function ViewAuditLogDialog({
  log,
  open,
  onOpenChange,
  showRecordLink = true,
}: ViewAuditLogDialogProps) {
  const href = showRecordLink ? getAuditLogHref(log) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>{log.summary}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Date & Time</FieldLabel>
            <p className="text-sm">{formatDateTime(new Date(log.createdAt))}</p>
          </Field>
          <Field>
            <FieldLabel>Done By</FieldLabel>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{log.actorName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel(log.actorRole)} · {log.actorEmail}
              </p>
            </div>
          </Field>
          <Field>
            <FieldLabel>Category</FieldLabel>
            <p className="text-sm">{AUDIT_ENTITY_LABELS[log.entityType]}</p>
          </Field>
          <Field>
            <FieldLabel>Action</FieldLabel>
            <div>
              <Badge variant={auditActionBadgeVariant(log.action)}>{AUDIT_ACTION_LABELS[log.action]}</Badge>
            </div>
          </Field>
        </div>

        {log.changes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Changes</p>
            <div className="divide-y rounded-lg border">
              {log.changes.map((change) => (
                <div key={change.label} className="space-y-1.5 p-3">
                  <p className="text-xs font-medium text-muted-foreground">{change.label}</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Before</dt>
                    <dd className="min-w-0 whitespace-pre-wrap wrap-break-word">{change.from ?? "—"}</dd>
                    <dt className="text-muted-foreground">After</dt>
                    <dd className="min-w-0 whitespace-pre-wrap wrap-break-word">{change.to ?? "—"}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}

        {href && (
          <DialogFooter>
            <Button asChild variant="outline">
              <Link href={href}>
                <ExternalLink />
                Open Record
              </Link>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
