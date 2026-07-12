"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getTakenTimeSlots } from "@/actions/court-reservations";
import { COURT_TIME_SLOTS } from "@/lib/court-reservations";

interface TimeSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const todayIso = new Date().toISOString().split("T")[0];

export default function TimeSlotsDialog({ open, onOpenChange }: TimeSlotsDialogProps) {
  const [date, setDate] = useState(todayIso);

  const { data: takenSlots = [], isLoading } = useQuery({
    queryKey: ["court-reservation-taken-slots", date],
    queryFn: () => getTakenTimeSlots(date),
    enabled: open && !!date,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Time Slots</DialogTitle>
          <DialogDescription>
            View which court time slots are already taken for a given date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="time-slots-date">Date</Label>
          <Input
            id="time-slots-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-emerald-600/30 bg-emerald-500" />
            Available
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-destructive/30 bg-destructive" />
            Taken
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-3">
            {COURT_TIME_SLOTS.map((slot) => {
              const isTaken = takenSlots.includes(slot.hour);
              return (
                <div
                  key={slot.hour}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-center text-xs font-medium",
                    isTaken
                      ? "border-destructive/30 bg-destructive/15 text-destructive line-through dark:text-red-400"
                      : "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {slot.label}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
