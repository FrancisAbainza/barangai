"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getTakenTimeRanges } from "@/actions/court-reservations";
import {
  formatTimeRange,
  getFreeRanges,
  MINUTES_PER_DAY,
  type CourtTimeRange,
} from "@/lib/court-reservations";

interface CourtAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const todayIso = new Date().toISOString().split("T")[0];

const TIMELINE_TICKS = [
  { minutes: 0, label: "12 AM" },
  { minutes: 6 * 60, label: "6 AM" },
  { minutes: 12 * 60, label: "12 PM" },
  { minutes: 18 * 60, label: "6 PM" },
  { minutes: MINUTES_PER_DAY, label: "12 AM" },
];

function toPercent(minutes: number) {
  return `${(minutes / MINUTES_PER_DAY) * 100}%`;
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
  const [date, setDate] = useState(todayIso);

  const { data: takenRanges = [], isLoading } = useQuery({
    queryKey: ["court-reservation-taken-ranges", date],
    queryFn: () => getTakenTimeRanges(date),
    enabled: open && !!date,
  });

  const freeRanges = getFreeRanges(takenRanges);

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
          <Input
            id="availability-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="relative h-6 overflow-hidden rounded-md border border-emerald-600/30 bg-emerald-500/15">
                {takenRanges.map((range) => (
                  <div
                    key={range.start}
                    title={formatTimeRange(range)}
                    className="absolute inset-y-0 bg-destructive/70"
                    style={{ left: toPercent(range.start), width: toPercent(range.end - range.start) }}
                  />
                ))}
              </div>
              <div className="relative h-4 text-[10px] text-muted-foreground">
                {TIMELINE_TICKS.map((tick, i) => (
                  <span
                    key={i}
                    className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                    style={{ left: toPercent(tick.minutes) }}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
              <RangeList
                title="Available"
                ranges={freeRanges}
                emptyText="Fully booked."
                dotClassName="border-emerald-600/30 bg-emerald-500"
              />
              <RangeList
                title="Booked"
                ranges={takenRanges}
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
