"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courtFeesFormSchema, CourtFeesFormValues } from "@/schemas/settings-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Save } from "lucide-react";

interface CourtFeesFormProps {
  defaultValues: CourtFeesFormValues;
  onSubmit: (data: CourtFeesFormValues) => Promise<void>;
}

export default function CourtFeesForm({
  defaultValues,
  onSubmit,
}: CourtFeesFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CourtFeesFormValues>({
    resolver: zodResolver(courtFeesFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Controller
          name="courtDayRate"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="courtDayRate">Day Rate (6:00 AM - 6:00 PM)</FieldLabel>
              <FieldDescription>Charged per hour during the day. An hour that crosses 6:00 AM or 6:00 PM uses this rate if at least 30 minutes of it falls in the day.</FieldDescription>
              <Input
                id="courtDayRate"
                type="number"
                min="0"
                step="0.01"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)
                }
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="courtNightRate"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="courtNightRate">Night Rate (6:00 PM - 6:00 AM)</FieldLabel>
              <FieldDescription>Charged per hour during the night, including hours with less than 30 minutes of daytime.</FieldDescription>
              <Input
                id="courtNightRate"
                type="number"
                min="0"
                step="0.01"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)
                }
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Court Fees
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
