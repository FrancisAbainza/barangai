"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Loader2, Newspaper } from "lucide-react";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newsFormSchema, NewsFormValues } from "@/schemas/news-schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import MediaUploader from "./media-uploader";
import AttachmentPicker from "./attachment-picker";
import { Checkbox } from "./ui/checkbox";

export default function NewsDialog() {
  const [open, setOpen] = useState(false);

  const handleNewsSubmit = async (data: NewsFormValues) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(data);

    reset();
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsFormValues>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: {
      title: undefined,
      category: "Announcement",
      content: "",
      media: [],
      attachments: [],
      pinned: false,
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 shrink-0">
          <Newspaper className="size-4" />
          Create News
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create News Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleNewsSubmit)}>
          <fieldset disabled={isSubmitting} className="space-y-4">
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                {...register("title")}
                id="title"
                placeholder="Enter post title"
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
                placeholder="Write your post content here..."
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
                    <span className="text-muted-foreground font-normal">
                      (optional, max 10)
                    </span>
                  </FieldLabel>
                  <MediaUploader
                    media={field.value}
                    onMediaChange={field.onChange}
                    maxFiles={10}
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
                    <span className="text-muted-foreground font-normal">
                      (optional, max 3)
                    </span>
                  </FieldLabel>
                  <AttachmentPicker
                    files={field.value}
                    onFilesChange={field.onChange}
                    maxFiles={3}
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
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
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
      </DialogContent>
    </Dialog>
  );
}