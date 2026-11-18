"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DatePicker from "@/components/date-picker";
import { toDateValue } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getTakenTimeRanges } from "@/actions/court-reservations";
import CourtAvailabilityGraph from "@/components/court-reservation/dialogs/court-availability-graph";
import {
  formatTimeRange,
  getFreeRanges,
  COURT_CLOSE,
  COURT_OPEN_START,
  type CourtTimeRange,
} from "@/lib/court-reservations";

interface CourtAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RangeList({ title, ranges, emptyText, dotClassName }: {
  title: string;
  ranges: CourtTimeRange[];
  emptyText: string;
  dotClassName: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={`size-2.5 rounded-full border ${dotClassName}`} />
        {title}
      </p>
      {ranges.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {ranges.map((range) => (
            <li key={range.start}>{formatTimeRange(range)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CourtAvailabilityDialog({ open, onOpenChange }: CourtAvailabilityDialogProps) {
  const [today] = useState(() => new Date());
  const [date, setDate] = useState(() => toDateValue(today));

  const { data: takenRanges = [], isLoading } = useQuery({
    queryKey: ["court-reservation-taken-ranges", date],
    queryFn: () => getTakenTimeRanges(date),
    enabled: open && !!date,
  });

  const operatingTakenRanges = takenRanges
    .map((range) => ({
      start: Math.max(range.start, COURT_OPEN_START),
      end: Math.min(range.end, COURT_CLOSE),
    }))
    .filter((range) => range.end > range.start);
  const freeRanges = getFreeRanges(operatingTakenRanges)
    .map((range) => ({
      start: Math.max(range.start, COURT_OPEN_START),
      end: Math.min(range.end, COURT_CLOSE),
    }))
    .filter((range) => range.end > range.start);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Court Availability</DialogTitle>
          <DialogDescription>
            See which times the court is already booked for a given date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="availability-date">Date</Label>
          <DatePicker
            id="availability-date"
            value={date}
            onChange={setDate}
            required
            disabledDays={[{ before: today }, { dayOfWeek: [5] }]}
            startMonth={today}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <CourtAvailabilityGraph bookedRanges={operatingTakenRanges} />

            <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
              <RangeList
                title="Available"
                ranges={freeRanges}
                emptyText="Fully booked."
                dotClassName="border-emerald-600/30 bg-emerald-500"
              />
              <RangeList
                title="Booked"
                ranges={operatingTakenRanges}
                emptyText="No bookings yet."
                dotClassName="border-destructive/30 bg-destructive"
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
