"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newsFormSchema, NewsFormValues } from "@/schemas/news-schema";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Loader2, Newspaper, Save } from "lucide-react";
import FileUploader from "../file-uploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";

interface NewsFormProps {
  mode?: "create" | "edit";
  defaultValues?: Partial<NewsFormValues>;
  onSubmit: (data: NewsFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: NewsFormValues = {
  title: "",
  category: "Announcement",
  content: "",
  media: [],
  attachments: [],
  pinned: false,
};

export default function NewsForm({ mode = "create", defaultValues, onSubmit, onCancel }: NewsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsFormValues>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  const handleFormSubmit = async (data: NewsFormValues) => {
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
            placeholder="Enter news title"
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
                  <SelectItem value="Announcement">Announcement</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Field data-invalid={!!errors.content}>
          <FieldLabel htmlFor="content">Content</FieldLabel>
          <Textarea
            {...register("content")}
            id="content"
            placeholder="Write your news content here..."
            className="min-h-32 resize-none"
            aria-invalid={!!errors.content}
          />
          <FieldError errors={[errors.content]} />
        </Field>

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

        <Controller
          name="pinned"
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id="pinned"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldLabel htmlFor="pinned" className="cursor-pointer">
                Pin to top
              </FieldLabel>
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
                <Newspaper className="size-4" />
                Create
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
