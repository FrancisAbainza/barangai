"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  complaintDismissalFormSchema,
  ComplaintDismissalFormValues,
} from "@/schemas/complaint-dismissal-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Loader2 } from "lucide-react";
import FileUploader from "@/components/file-uploader";

interface ComplaintDismissalFormProps {
  defaultValues?: Partial<ComplaintDismissalFormValues>;
  onSubmit: (data: ComplaintDismissalFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: ComplaintDismissalFormValues = {
  reason: "",
  attachments: [],
};

export default function ComplaintDismissalForm({
  defaultValues,
  onSubmit,
  onCancel,
}: ComplaintDismissalFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ComplaintDismissalFormValues>({
    resolver: zodResolver(complaintDismissalFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.reason}>
          <FieldLabel htmlFor="reason">Reason</FieldLabel>
          <FieldDescription>Let the complainant know why this complaint was dismissed.</FieldDescription>
          <Textarea
            {...register("reason")}
            id="reason"
            placeholder="e.g. This complaint could not be validated based on the submitted evidence."
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
              <FieldDescription>Attach any supporting file for this dismissal, if needed.</FieldDescription>
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
                Dismiss Complaint
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
