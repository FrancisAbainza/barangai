"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BUSINESS_CATEGORIES,
  businessFormSchema,
  BusinessFormValues,
  DAYS_OF_WEEK,
} from "@/schemas/business-schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Store } from "lucide-react";
import FileUploader from "@/components/file-uploader";
import MapPicker from "@/components/map-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BusinessFormProps {
  defaultValues?: Partial<BusinessFormValues>;
  onSubmit: (data: BusinessFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: BusinessFormValues = {
  name: "",
  description: "",
  category: "Food & Beverage",
  contactNumber: "",
  socialMediaLink: "",
  operatingHours: { days: [], opens: "", closes: "" },
  photos: [],
  permit: [],
  location: undefined,
};

export default function BusinessForm({ defaultValues, onSubmit, onCancel }: BusinessFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            {...register("name")}
            id="name"
            placeholder="Enter business name"
            aria-invalid={!!errors.name}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            {...register("description")}
            id="description"
            placeholder="Describe the business..."
            className="min-h-28 resize-none"
            aria-invalid={!!errors.description}
          />
          <FieldError errors={[errors.description]} />
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
                  {BUSINESS_CATEGORIES.map((category) => (
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

        <Field data-invalid={!!errors.contactNumber}>
          <FieldLabel htmlFor="contactNumber">Contact Number</FieldLabel>
          <Input
            {...register("contactNumber")}
            id="contactNumber"
            type="tel"
            placeholder="e.g. 09171234567"
            aria-invalid={!!errors.contactNumber}
          />
          <FieldError errors={[errors.contactNumber]} />
        </Field>

        <Field data-invalid={!!errors.socialMediaLink}>
          <FieldLabel htmlFor="socialMediaLink">
            Social Media Link <span className="text-muted-foreground font-normal">(optional)</span>
          </FieldLabel>
          <Input
            {...register("socialMediaLink")}
            id="socialMediaLink"
            placeholder="e.g. https://facebook.com/yourbusiness"
            aria-invalid={!!errors.socialMediaLink}
          />
          <FieldError errors={[errors.socialMediaLink]} />
        </Field>

        <Controller
          name="operatingHours.days"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Operating Days</FieldLabel>
              <div className="flex flex-wrap gap-3">
                {DAYS_OF_WEEK.map((day) => {
                  const checked = field.value?.includes(day) ?? false;
                  return (
                    <Field key={day} orientation="horizontal" className="w-fit gap-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={checked}
                        onCheckedChange={(value) => {
                          const next = value
                            ? [...field.value, day]
                            : field.value.filter((d) => d !== day);
                          field.onChange(next);
                        }}
                      />
                      <FieldLabel htmlFor={`day-${day}`} className="cursor-pointer">
                        {day}
                      </FieldLabel>
                    </Field>
                  );
                })}
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.operatingHours?.opens}>
            <FieldLabel htmlFor="opens">Opens</FieldLabel>
            <Input
              {...register("operatingHours.opens")}
              id="opens"
              type="time"
              aria-invalid={!!errors.operatingHours?.opens}
            />
            <FieldError errors={[errors.operatingHours?.opens]} />
          </Field>

          <Field data-invalid={!!errors.operatingHours?.closes}>
            <FieldLabel htmlFor="closes">Closes</FieldLabel>
            <Input
              {...register("operatingHours.closes")}
              id="closes"
              type="time"
              aria-invalid={!!errors.operatingHours?.closes}
            />
            <FieldError errors={[errors.operatingHours?.closes]} />
          </Field>
        </div>

        <Controller
          name="photos"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>
                Business Photos{" "}
                <span className="text-muted-foreground font-normal">(optional, max 10)</span>
              </FieldLabel>
              <FileUploader
                files={field.value}
                onFilesChange={field.onChange}
                maxFiles={10}
                accept={["images"]}
              />
            </Field>
          )}
        />

        <Controller
          name="permit"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>
                Business Permit <span className="text-muted-foreground font-normal">(max 1)</span>
              </FieldLabel>
              <FileUploader
                files={field.value}
                onFilesChange={field.onChange}
                maxFiles={1}
                accept={["documents"]}
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
                <Store className="size-4" />
                Submit Business
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
