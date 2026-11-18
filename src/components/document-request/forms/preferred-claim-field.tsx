"use client";

import { useEffect } from "react";
import type { FieldError as FormFieldError } from "react-hook-form";
import DateTimePicker from "@/components/date-time-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { getPhilippineTime, parseDateValue, toDateValue } from "@/lib/utils";

interface PreferredClaimFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: FormFieldError;
}

// Used through a `Controller` on `preferredClaimAt`; forms only render it for pickups. Claims can
// be made from today onward, Monday to Friday, from 8:00 AM to 5:00 PM.
export default function PreferredClaimField({ value, onChange, error }: PreferredClaimFieldProps) {
  function getNextClaimDateTime() {
    const now = getPhilippineTime();
    const fifteenMinutesFromNow = now.minutes + 15;
    const earliestOfficeTime = Math.max(fifteenMinutesFromNow, 8 * 60);
    const candidateMinutes = Math.ceil(earliestOfficeTime / 30) * 30;
    console.log(Math.max(now.minutes + 15, 8 * 60))
    console.log(Math.max(now.minutes + 15, 8 * 60) / 30)
    console.log(Math.ceil(Math.max(now.minutes + 15, 8 * 60) / 30) * 30)
    if (candidateMinutes <= 17 * 60) {
      const hours = Math.floor(candidateMinutes / 60);
      const minutes = candidateMinutes % 60;
      return {
        date: now.date,
        time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      };
    }

    const tomorrow = parseDateValue(now.date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return { date: toDateValue(tomorrow), time: "09:00" };
  }

  const nextClaim = getNextClaimDateTime();
  const suggestedValue = value || `${nextClaim.date}T${nextClaim.time}`;

  useEffect(() => {
    if (!value && suggestedValue) onChange(suggestedValue);
  }, [value, suggestedValue, onChange]);

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="preferredClaimAt">Preferred Claim Date &amp; Time</FieldLabel>
      <DateTimePicker
        id="preferredClaimAt"
        value={suggestedValue}
        onChange={onChange}
        disabledDays={[{ before: new Date() }, { dayOfWeek: [0, 6] }]}
        minTime={nextClaim.time}
        maxTime="17:00"
        step={30}
        aria-invalid={!!error}
      />
      <FieldDescription>Claiming is Monday to Friday, 8:00 AM to 5:00 PM.</FieldDescription>
      <FieldError errors={[error]} />
    </Field>
  );
}
