"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  documentRequestSettingsFormSchema,
  DocumentRequestSettingsFormValues,
} from "@/schemas/settings-schema";
import { CLEARANCE_PURPOSES } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Save } from "lucide-react";

interface BarangaySettingsFormProps {
  defaultValues: DocumentRequestSettingsFormValues;
  onSubmit: (data: DocumentRequestSettingsFormValues) => Promise<void>;
  onCancel?: () => void;
}

export default function BarangaySettingsForm({
  defaultValues,
  onSubmit,
  onCancel,
}: BarangaySettingsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DocumentRequestSettingsFormValues>({
    resolver: zodResolver(documentRequestSettingsFormSchema),
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

        {CLEARANCE_PURPOSES.map((purpose) => (
          <Controller
            key={purpose}
            name={`clearancePurposeFees.${purpose}`}
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`fee-${purpose}`}>{purpose} Fee</FieldLabel>
                <Input
                  id={`fee-${purpose}`}
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
        ))}

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
