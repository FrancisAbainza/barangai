"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  noObjectionDocumentRequestFormSchema,
  NoObjectionDocumentRequestFormValues,
  NO_OBJECTION_REQUEST_PURPOSES,
  NO_OBJECTION_DELIVERY_METHODS,
} from "@/schemas/no-objection-document-request-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NoObjectionDocumentRequestFormProps {
  defaultValues?: Partial<NoObjectionDocumentRequestFormValues>;
  onSubmit: (data: NoObjectionDocumentRequestFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: NoObjectionDocumentRequestFormValues = {
  purpose: NO_OBJECTION_REQUEST_PURPOSES[0],
  otherPurpose: "",
  receiveVia: NO_OBJECTION_DELIVERY_METHODS[0],
};

export default function NoObjectionDocumentRequestForm({
  defaultValues,
  onSubmit,
  onCancel,
}: NoObjectionDocumentRequestFormProps) {
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NoObjectionDocumentRequestFormValues>({
    resolver: zodResolver(noObjectionDocumentRequestFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  const purpose = watch("purpose");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Controller
          name="purpose"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Purpose</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {NO_OBJECTION_REQUEST_PURPOSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {purpose === "Other" && (
          <Field data-invalid={!!errors.otherPurpose}>
            <FieldLabel htmlFor="otherPurpose">Specify Purpose</FieldLabel>
            <Input
              {...register("otherPurpose")}
              id="otherPurpose"
              placeholder="Enter your purpose"
              aria-invalid={!!errors.otherPurpose}
            />
            <FieldError errors={[errors.otherPurpose]} />
          </Field>
        )}

        <Controller
          name="receiveVia"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Receive Document Via</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  {NO_OBJECTION_DELIVERY_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                Submit Request
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
