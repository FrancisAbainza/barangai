"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  businessRejectionFormSchema,
  BusinessRejectionFormValues,
} from "@/schemas/business-rejection-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Loader2 } from "lucide-react";
import FileUploader from "@/components/file-uploader";

interface BusinessRejectionFormProps {
  defaultValues?: Partial<BusinessRejectionFormValues>;
  onSubmit: (data: BusinessRejectionFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: BusinessRejectionFormValues = {
  reason: "",
  attachments: [],
};

export default function BusinessRejectionForm({
  defaultValues,
  onSubmit,
  onCancel,
}: BusinessRejectionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessRejectionFormValues>({
    resolver: zodResolver(businessRejectionFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.reason}>
          <FieldLabel htmlFor="reason">Reason</FieldLabel>
          <FieldDescription>Let the owner know why this business was rejected.</FieldDescription>
          <Textarea
            {...register("reason")}
            id="reason"
            placeholder="e.g. The submitted business permit is unreadable. Please resubmit a clearer copy."
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
                Reject Business
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
