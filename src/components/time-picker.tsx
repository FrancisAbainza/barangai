"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  id?: string;
  // 24-hour "HH:MM", or "" when no time is picked.
  value: string;
  onChange: (value: string) => void;
  // The earliest and latest times allowed ("HH:MM").
  minTime?: string;
  maxTime?: string;
  // Minutes between the times offered in a dropdown. Without it, the field is a regular time input
  // that takes any minute (and the browser only flags times outside `minTime`–`maxTime`).
  step?: number;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

function getTimes(minTime: string, maxTime: string, step: number): string[] {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const times = [];
  for (let minutes = toMinutes(minTime); minutes <= toMinutes(maxTime); minutes += step) {
    times.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  return times;
}

// "13:30" → "1:30 PM"
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${pad(minutes)} ${hours < 12 ? "AM" : "PM"}`;
}

// The app's time input: a dropdown of times every `step` minutes, or a regular time input.
export default function TimePicker({
  id,
  value,
  onChange,
  minTime = "00:00",
  maxTime = "23:59",
  step,
  placeholder = "Pick a time",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  className,
}: TimePickerProps) {
  if (!step) {
    return (
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={minTime}
        max={maxTime}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={className}
      />
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        className={cn("w-full", className)}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {getTimes(minTime, maxTime, step).map((time) => (
          <SelectItem key={time} value={time}>
            {formatTime(time)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
