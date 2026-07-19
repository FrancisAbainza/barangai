"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courtSettingsFormSchema, CourtSettingsFormValues } from "@/schemas/settings-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Save } from "lucide-react";

interface CourtSettingsFormProps {
  defaultValues: CourtSettingsFormValues;
  onSubmit: (data: CourtSettingsFormValues) => Promise<void>;
  onCancel?: () => void;
}

export default function CourtSettingsForm({
  defaultValues,
  onSubmit,
  onCancel,
}: CourtSettingsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourtSettingsFormValues>({
    resolver: zodResolver(courtSettingsFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.gcashNumber}>
          <FieldLabel htmlFor="gcashNumber">GCash Number</FieldLabel>
          <FieldDescription>
            Shown to residents on payment-based document and court reservation requests.
          </FieldDescription>
          <Input
            {...register("gcashNumber")}
            id="gcashNumber"
            placeholder="e.g. 0917-123-4567"
            aria-invalid={!!errors.gcashNumber}
          />
          <FieldError errors={[errors.gcashNumber]} />
        </Field>

        <Controller
          name="courtDayRate"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="courtDayRate">Day Rate (6:00 AM - 6:00 PM)</FieldLabel>
              <FieldDescription>Charged per 1-hour slot during the day.</FieldDescription>
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
              <FieldDescription>Charged per 1-hour slot during the night.</FieldDescription>
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

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
