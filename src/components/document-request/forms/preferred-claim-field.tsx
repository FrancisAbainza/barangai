"use client";

import { useState, type ComponentProps } from "react";
import type { FieldError as FormFieldError } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toDateTimeLocalInput } from "@/lib/document-requests";

interface PreferredClaimFieldProps extends ComponentProps<"input"> {
  error?: FormFieldError;
}

// Takes `register("preferredClaimAt")`; forms only render it for pickups. `min` keeps the picker
// from offering past times, and `checkPreferredClaimAt` re-checks on submit in case the form sat
// open past the chosen time.
export default function PreferredClaimField({ error, ...props }: PreferredClaimFieldProps) {
  const [minValue] = useState(() => toDateTimeLocalInput(new Date()));

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="preferredClaimAt">Preferred Claim Date &amp; Time</FieldLabel>
      <Input
        {...props}
        id="preferredClaimAt"
        type="datetime-local"
        min={minValue}
        aria-invalid={!!error}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}
