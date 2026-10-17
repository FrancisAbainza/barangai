"use client";

import { useState } from "react";
import type { Matcher } from "react-day-picker";
import DatePicker from "@/components/date-picker";
import TimePicker from "@/components/time-picker";

interface DateTimePickerProps {
  id?: string;
  // Local "YYYY-MM-DDTHH:MM", or "" until both a day and a time are picked.
  value: string;
  onChange: (value: string) => void;
  // Days that can't be picked, e.g. `[{ before: new Date() }, { dayOfWeek: [0, 6] }]`.
  disabledDays?: Matcher | Matcher[];
  // Passed to `TimePicker`.
  minTime?: string;
  maxTime?: string;
  step?: number;
  "aria-invalid"?: boolean;
}

// A `DatePicker` and a `TimePicker` that fill one value, which `new Date(value)` reads as local
// time. The day and time are also kept in state, since `value` can't hold one without the other.
export default function DateTimePicker({
  id,
  value,
  onChange,
  disabledDays,
  minTime,
  maxTime,
  step,
  "aria-invalid": ariaInvalid,
}: DateTimePickerProps) {
  const [day, setDay] = useState(() => value.split("T")[0]);
  const [time, setTime] = useState(() => value.split("T")[1] ?? "");

  function update(nextDay: string, nextTime: string) {
    setDay(nextDay);
    setTime(nextTime);
    onChange(nextDay && nextTime ? `${nextDay}T${nextTime}` : "");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DatePicker
        id={id}
        value={day}
        onChange={(nextDay) => update(nextDay, time)}
        disabledDays={disabledDays}
        aria-invalid={ariaInvalid}
      />
      <TimePicker
        value={time}
        onChange={(nextTime) => update(day, nextTime)}
        minTime={minTime}
        maxTime={maxTime}
        step={step}
        aria-label="Time"
        aria-invalid={ariaInvalid}
      />
    </div>
  );
}
