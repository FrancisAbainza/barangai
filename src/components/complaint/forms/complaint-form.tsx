"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { complaintFormSchema, ComplaintFormValues } from "@/schemas/complaint-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MapPicker from "@/components/map-picker";
import FileUploader from "@/components/file-uploader";

interface ComplaintFormProps {
  defaultValues?: Partial<ComplaintFormValues>;
  onSubmit: (data: ComplaintFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: Partial<ComplaintFormValues> = {
  subject: "",
  description: "",
  evidence: [],
};

export default function ComplaintForm({ defaultValues, onSubmit, onCancel }: ComplaintFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.subject}>
          <FieldLabel htmlFor="subject">Subject</FieldLabel>
          <Input
            {...register("subject")}
            id="subject"
            placeholder="Briefly describe the issue"
            aria-invalid={!!errors.subject}
          />
          <FieldError errors={[errors.subject]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            {...register("description")}
            id="description"
            placeholder="Provide as much detail as you can..."
            className="min-h-28 resize-none"
            aria-invalid={!!errors.description}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Controller
          name="location"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Location of Incident</FieldLabel>
              <MapPicker value={field.value} onChange={field.onChange} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="evidence"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Evidence</FieldLabel>
              <FileUploader
                files={field.value}
                onFilesChange={field.onChange}
                maxFiles={5}
                accept={["images", "videos"]}
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
                Submitting
              </>
            ) : (
              <>
                <Send className="size-4" />
                Submit Complaint
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
