"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { officialFormSchema, OfficialFormValues } from "@/schemas/about-us-schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import MediaUploader from "@/components/media-uploader";

interface OfficialFormProps {
  defaultValues: OfficialFormValues;
  leaderDisabled?: boolean;
  submitLabel?: string;
  onSubmit: (data: OfficialFormValues) => Promise<void>;
  onCancel?: () => void;
}

export default function OfficialForm({
  defaultValues,
  leaderDisabled,
  submitLabel = "Save Changes",
  onSubmit,
  onCancel,
}: OfficialFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OfficialFormValues>({
    resolver: zodResolver(officialFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input
            {...register("name")}
            id="name"
            placeholder="Enter full name"
            aria-invalid={!!errors.name}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.position}>
          <FieldLabel htmlFor="position">Position</FieldLabel>
          <Input
            {...register("position")}
            id="position"
            placeholder="e.g. Kagawad"
            aria-invalid={!!errors.position}
          />
          <FieldError errors={[errors.position]} />
        </Field>

        <Controller
          name="photo"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Photo</FieldLabel>
              <MediaUploader
                media={field.value}
                onMediaChange={field.onChange}
                maxFiles={1}
                accept="images"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="isLeader"
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal" data-disabled={leaderDisabled}>
              <Checkbox
                id="isLeader"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={leaderDisabled}
              />
              <FieldLabel htmlFor="isLeader" className="cursor-pointer">
                Set as leader
              </FieldLabel>
            </Field>
          )}
        />
        {leaderDisabled && (
          <FieldDescription className="-mt-3">
            Another official is already set as leader. Remove them first to reassign this role.
          </FieldDescription>
        )}

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
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
