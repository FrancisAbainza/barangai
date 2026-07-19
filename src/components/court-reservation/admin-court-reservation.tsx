"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUpDown, CalendarCheck, Clock, Hourglass, ListFilter, Search, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import StatCard from "@/components/stat-card";
import CourtReservationActionsMenu from "@/components/court-reservation/court-reservation-actions-menu";
import CourtReservationDialog from "@/components/court-reservation/dialogs/court-reservation-dialog";
import TimeSlotsDialog from "@/components/court-reservation/dialogs/time-slots-dialog";
import AdminCourtSettingsDialog from "@/components/court-reservation/dialogs/admin-court-settings-dialog";
import { getCourtReservations, getCourtReservationStats } from "@/actions/court-reservations";
import {
  COURT_TIME_SLOTS,
  statusBadgeVariant,
  formatTimeSlots,
  formatReservationDate,
} from "@/lib/court-reservations";

const TIME_SLOT_FILTERS = [
  { value: "all", label: "All Time Slots" },
  ...COURT_TIME_SLOTS.map((slot) => ({ value: String(slot.hour), label: slot.label })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

function ReservationRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
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

export default function AdminCourtReservation() {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [timeSlotsOpen, setTimeSlotsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const activeFilterCount = [date !== "", timeSlot !== "all"].filter(Boolean).length;

  function clearFilters() {
    setDate("");
    setTimeSlot("all");
  }

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["court-reservations", "admin", "stats"],
    queryFn: () => getCourtReservationStats(),
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["court-reservations", "admin", { search: debouncedSearch, date, timeSlot, sortOrder }],
    queryFn: ({ pageParam }) =>
      getCourtReservations({
        offset: pageParam,
        search: debouncedSearch,
        date,
        timeSlot: timeSlot === "all" ? "all" : Number(timeSlot),
        sortOrder,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

  const reservations = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2">
        <StatCard
          label="Total Reservations"
          value={stats?.total ?? 0}
          description="All reservations in system"
          icon={CalendarCheck}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Pending"
          value={stats?.pending ?? 0}
          description="Awaiting review"
          icon={Hourglass}
          isLoading={isStatsLoading}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <CalendarCheck className="self-center size-8 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold leading-tight">Need to reserve the court?</p>
            <p className="text-sm text-muted-foreground">
              Create a reservation directly — it will be approved automatically.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => setTimeSlotsOpen(true)}>
            <Clock className="size-4" />
            Time Slots
          </Button>
          <Button className="flex-1 gap-2" onClick={() => setReserveOpen(true)}>
            <CalendarCheck className="size-4" />
            Reserve Court
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by requester…"
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
            <SelectTrigger className="w-40 shrink-0">
              <ArrowUpDown className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <ListFilter />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="rounded-full px-1.5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Reservations</DialogTitle>
                <DialogDescription>
                  Narrow down court reservations by reservation date or time slot.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reservation-date">Reservation Date</Label>
                  <Input
                    id="reservation-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Time Slot</Label>
                  <Select value={timeSlot} onValueChange={setTimeSlot}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOT_FILTERS.map((filter) => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={clearFilters} disabled={activeFilterCount === 0}>
                  Clear filters
                </Button>
                <Button onClick={() => setFiltersOpen(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="shrink-0" onClick={() => setSettingsOpen(true)}>
            <Settings />
            Settings
          </Button>
        </div>
      </div>

      <TimeSlotsDialog open={timeSlotsOpen} onOpenChange={setTimeSlotsOpen} />
      <AdminCourtSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CourtReservationDialog open={reserveOpen} onOpenChange={setReserveOpen} />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Time Slot</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <ReservationRowSkeleton />
                <ReservationRowSkeleton />
                <ReservationRowSkeleton />
              </>
            ) : reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  No reservations found.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <p className="font-medium truncate">{reservation.requesterName}</p>
                      <p className="text-xs text-muted-foreground truncate">{reservation.requesterEmail}</p>
                    </TableCell>
                    <TableCell>
                      <p className="truncate">{formatReservationDate(reservation.date)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatTimeSlots(reservation.timeSlots)}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{reservation.purpose}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(reservation.status)}>{reservation.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <CourtReservationActionsMenu reservation={reservation} />
                    </TableCell>
                  </TableRow>
                ))}
                {hasNextPage && (
                  <LoadMoreTrigger colSpan={5} onIntersect={fetchNextPage} disabled={isFetchingNextPage} />
                )}
                {isFetchingNextPage && <ReservationRowSkeleton />}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
