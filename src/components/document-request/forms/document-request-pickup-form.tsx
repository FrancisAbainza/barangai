"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  documentRequestPickupFormSchema,
  DocumentRequestPickupFormValues,
} from "@/schemas/document-request-pickup-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import FileUploader from "@/components/file-uploader";

interface DocumentRequestPickupFormProps {
  defaultValues?: Partial<DocumentRequestPickupFormValues>;
  onSubmit: (data: DocumentRequestPickupFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: DocumentRequestPickupFormValues = {
  message: "",
  attachments: [],
};

export default function DocumentRequestPickupForm({
  defaultValues,
  onSubmit,
  onCancel,
}: DocumentRequestPickupFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DocumentRequestPickupFormValues>({
    resolver: zodResolver(documentRequestPickupFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.message}>
          <FieldLabel htmlFor="message">Message</FieldLabel>
          <FieldDescription>Let the requester know their document is ready for pickup.</FieldDescription>
          <Textarea
            {...register("message")}
            id="message"
            placeholder="e.g. Your document is ready for pickup at the Barangay Hall."
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
                Upload a soft copy of the requested document, if available.
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
          <Button type="submit" className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Send className="size-4" />
                Mark as Ready for Pickup
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
