import { formatTimeRange, COURT_CLOSE, COURT_OPEN_START, type CourtTimeRange } from "@/lib/court-reservations";

interface CourtAvailabilityGraphProps {
  bookedRanges: CourtTimeRange[];
}

const TIMELINE_TICKS = [
  { minutes: COURT_OPEN_START, label: "8 AM" },
  { minutes: 10 * 60, label: "10 AM" },
  { minutes: 12 * 60, label: "12 PM" },
  { minutes: 14 * 60, label: "2 PM" },
  { minutes: 16 * 60, label: "4 PM" },
  { minutes: 18 * 60, label: "6 PM" },
  { minutes: 20 * 60, label: "8 PM" },
  { minutes: COURT_CLOSE, label: "10 PM" },
];

function toPositionPercent(minutes: number) {
  return `${((minutes - COURT_OPEN_START) / (COURT_CLOSE - COURT_OPEN_START)) * 100}%`;
}

function toWidthPercent(minutes: number) {
  return `${(minutes / (COURT_CLOSE - COURT_OPEN_START)) * 100}%`;
}

export default function CourtAvailabilityGraph({ bookedRanges }: CourtAvailabilityGraphProps) {
  return (
    <div className="space-y-1" role="img" aria-label="Court availability from 8 AM to 10 PM">
      <div className="relative h-6 overflow-hidden rounded-md border border-emerald-600/30 bg-emerald-500/15">
        {bookedRanges.map((range) => (
          <div
            key={range.start}
            title={formatTimeRange(range)}
            className="absolute inset-y-0 bg-destructive/70"
            style={{
              left: toPositionPercent(range.start),
              width: toWidthPercent(range.end - range.start),
            }}
          />
        ))}
      </div>
      <div className="relative h-4 text-[10px] text-muted-foreground">
        {TIMELINE_TICKS.map((tick, index) => (
          <span
            key={tick.minutes}
            className={`absolute ${index === 0 ? "" : index === TIMELINE_TICKS.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: toPositionPercent(tick.minutes) }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
