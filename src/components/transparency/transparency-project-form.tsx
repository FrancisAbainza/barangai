"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TRANSPARENCY_CATEGORIES,
  transparencyProjectFormSchema,
  TransparencyProjectFormValues,
} from "@/schemas/transparency-schema";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { FolderKanban, Loader2, Save } from "lucide-react";
import FileUploader from "../file-uploader";
import MapPicker from "../map-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface TransparencyProjectFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<TransparencyProjectFormValues>;
  onSubmit: (data: TransparencyProjectFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: TransparencyProjectFormValues = {
  title: "",
  category: "Infrastructure",
  description: "",
  budget: undefined,
  location: undefined,
  media: [],
  attachments: [],
};

export default function TransparencyProjectForm({
  mode = "create",
  defaultValues,
  onSubmit,
  onCancel,
}: TransparencyProjectFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransparencyProjectFormValues>({
    resolver: zodResolver(transparencyProjectFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  const handleFormSubmit = async (data: TransparencyProjectFormValues) => {
    await onSubmit(data);
    if (mode === "create") reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            {...register("title")}
            id="title"
            placeholder="Enter project title"
            aria-invalid={!!errors.title}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Controller
          name="category"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Category</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPARENCY_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            {...register("description")}
            id="description"
            placeholder="Describe the project..."
            className="min-h-32 resize-none"
            aria-invalid={!!errors.description}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Controller
          name="budget"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="budget">
                Budget <span className="text-muted-foreground font-normal">(optional)</span>
              </FieldLabel>
              <Input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 150000"
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
          name="location"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>
                Location <span className="text-muted-foreground font-normal">(optional)</span>
              </FieldLabel>
              <MapPicker value={field.value} onChange={field.onChange} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="media"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>
                Media{" "}
                <span className="text-muted-foreground font-normal">(optional, max 10)</span>
              </FieldLabel>
              <FileUploader
                files={field.value}
                onFilesChange={field.onChange}
                maxFiles={10}
                accept={["images", "videos"]}
              />
            </Field>
          )}
        />

        <Controller
          name="attachments"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>
                Attachments{" "}
                <span className="text-muted-foreground font-normal">(optional, max 3)</span>
              </FieldLabel>
              <FileUploader
                files={field.value}
                onFilesChange={field.onChange}
                maxFiles={3}
                accept={["documents"]}
              />
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
            ) : mode === "edit" ? (
              <>
                <Save className="size-4" />
                Save Changes
              </>
            ) : (
              <>
                <FolderKanban className="size-4" />
                Create
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
