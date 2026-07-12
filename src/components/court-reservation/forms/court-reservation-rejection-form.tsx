"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  courtReservationRejectionFormSchema,
  CourtReservationRejectionFormValues,
} from "@/schemas/court-reservation-rejection-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Loader2 } from "lucide-react";
import FileUploader from "@/components/file-uploader";

interface CourtReservationRejectionFormProps {
  defaultValues?: Partial<CourtReservationRejectionFormValues>;
  onSubmit: (data: CourtReservationRejectionFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: CourtReservationRejectionFormValues = {
  reason: "",
  attachments: [],
};

export default function CourtReservationRejectionForm({
  defaultValues,
  onSubmit,
  onCancel,
}: CourtReservationRejectionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourtReservationRejectionFormValues>({
    resolver: zodResolver(courtReservationRejectionFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.reason}>
          <FieldLabel htmlFor="reason">Reason</FieldLabel>
          <FieldDescription>Let the requester know why this reservation was rejected.</FieldDescription>
          <Textarea
            {...register("reason")}
            id="reason"
            placeholder="e.g. The uploaded GCash payment receipt is unreadable. Please resubmit a clearer copy."
            aria-invalid={!!errors.reason}
          />
          <FieldError errors={[errors.reason]} />
        </Field>

        <Controller
          name="attachments"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Attachments (optional)</FieldLabel>
              <FieldDescription>Attach any supporting file for this rejection, if needed.</FieldDescription>
              <FileUploader
                files={field.value}
                onFilesChange={field.onChange}
                maxFiles={5}
                accept={["images", "documents"]}
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
          <Button type="submit" variant="destructive" className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Ban className="size-4" />
                Reject Reservation
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
