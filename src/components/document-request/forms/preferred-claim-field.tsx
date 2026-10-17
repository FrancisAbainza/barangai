"use client";

import type { FieldError as FormFieldError } from "react-hook-form";
import DateTimePicker from "@/components/date-time-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

interface PreferredClaimFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: FormFieldError;
}

// Used through a `Controller` on `preferredClaimAt`; forms only render it for pickups. Claims can
// be made from today onward, Tuesday to Friday (Sunday, Monday and Saturday are disabled), from
// 9:00 AM to 5:00 PM.
export default function PreferredClaimField({ value, onChange, error }: PreferredClaimFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="preferredClaimAt">Preferred Claim Date &amp; Time</FieldLabel>
      <DateTimePicker
        id="preferredClaimAt"
        value={value}
        onChange={onChange}
        disabledDays={[{ before: new Date() }, { dayOfWeek: [0, 1, 6] }]}
        minTime="09:00"
        maxTime="17:00"
        step={30}
        aria-invalid={!!error}
      />
      <FieldDescription>Claiming is Tuesday to Friday, 9:00 AM to 5:00 PM.</FieldDescription>
      <FieldError errors={[error]} />
    </Field>
  );
}
