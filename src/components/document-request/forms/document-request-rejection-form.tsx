"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  documentRequestRejectionFormSchema,
  DocumentRequestRejectionFormValues,
} from "@/schemas/document-request-rejection-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Loader2 } from "lucide-react";
import FileUploader from "@/components/file-uploader";

interface DocumentRequestRejectionFormProps {
  defaultValues?: Partial<DocumentRequestRejectionFormValues>;
  onSubmit: (data: DocumentRequestRejectionFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: DocumentRequestRejectionFormValues = {
  message: "",
  attachments: [],
};

export default function DocumentRequestRejectionForm({
  defaultValues,
  onSubmit,
  onCancel,
}: DocumentRequestRejectionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DocumentRequestRejectionFormValues>({
    resolver: zodResolver(documentRequestRejectionFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.message}>
          <FieldLabel htmlFor="message">Message</FieldLabel>
          <FieldDescription>Let the requester know why their request was rejected.</FieldDescription>
          <Textarea
            {...register("message")}
            id="message"
            placeholder="e.g. Your submitted valid ID is unreadable. Please resubmit a clearer copy."
            aria-invalid={!!errors.message}
          />
          <FieldError errors={[errors.message]} />
        </Field>

        <Controller
          name="attachments"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Attachments (optional)</FieldLabel>
              <FieldDescription>
                Attach any supporting file for this rejection, if needed.
              </FieldDescription>
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
                Reject Request
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
