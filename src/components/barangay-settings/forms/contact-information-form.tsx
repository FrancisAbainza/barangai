"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactInformationFormSchema, ContactInformationFormValues } from "@/schemas/settings-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Save } from "lucide-react";

interface ContactInformationFormProps {
  defaultValues: ContactInformationFormValues;
  onSubmit: (data: ContactInformationFormValues) => Promise<void>;
}

export default function ContactInformationForm({ defaultValues, onSubmit }: ContactInformationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInformationFormValues>({
    resolver: zodResolver(contactInformationFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.hotline1}>
            <FieldLabel htmlFor="hotline1">Hotline 1</FieldLabel>
            <FieldDescription>Also shown as the emergency hotline on the landing page.</FieldDescription>
            <Input
              {...register("hotline1")}
              id="hotline1"
              type="tel"
              placeholder="e.g. (046) 412 4977"
              aria-invalid={!!errors.hotline1}
            />
            <FieldError errors={[errors.hotline1]} />
          </Field>

          <Field data-invalid={!!errors.hotline2}>
            <FieldLabel htmlFor="hotline2">Hotline 2</FieldLabel>
            <FieldDescription>Optional. Leave blank if the barangay has only one hotline.</FieldDescription>
            <Input
              {...register("hotline2")}
              id="hotline2"
              type="tel"
              placeholder="e.g. (046) 412 7218"
              aria-invalid={!!errors.hotline2}
            />
            <FieldError errors={[errors.hotline2]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          {/* inputMode instead of type="email" so the browser's own validation doesn't pre-empt the form's message. */}
          <Input
            {...register("email")}
            id="email"
            inputMode="email"
            placeholder="e.g. barangay@gmail.com"
            aria-invalid={!!errors.email}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <FieldDescription>Shown in the landing page footer.</FieldDescription>
          <Input
            {...register("address")}
            id="address"
            placeholder="e.g. Barangay Hall, Maduya, City of Carmona, Cavite"
            aria-invalid={!!errors.address}
          />
          <FieldError errors={[errors.address]} />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Contact Information
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
