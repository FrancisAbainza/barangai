"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  indigencyDocumentRequestFormSchema,
  IndigencyDocumentRequestFormValues,
  INDIGENCY_REQUEST_PURPOSES,
  INDIGENCY_DELIVERY_METHODS,
} from "@/schemas/indigency-document-request-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import FileUploader from "@/components/file-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IndigencyDocumentRequestFormProps {
  defaultValues?: Partial<IndigencyDocumentRequestFormValues>;
  onSubmit: (data: IndigencyDocumentRequestFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: IndigencyDocumentRequestFormValues = {
  purpose: INDIGENCY_REQUEST_PURPOSES[0],
  otherPurpose: "",
  situationDescription: "",
  supportingDocuments: [],
  receiveVia: INDIGENCY_DELIVERY_METHODS[0],
};

export default function IndigencyDocumentRequestForm({
  defaultValues,
  onSubmit,
  onCancel,
}: IndigencyDocumentRequestFormProps) {
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IndigencyDocumentRequestFormValues>({
    resolver: zodResolver(indigencyDocumentRequestFormSchema),
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
                  {INDIGENCY_REQUEST_PURPOSES.map((option) => (
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

        <Field data-invalid={!!errors.situationDescription}>
          <FieldLabel htmlFor="situationDescription">
            Brief Description of the Situation
          </FieldLabel>
          <Textarea
            {...register("situationDescription")}
            id="situationDescription"
            placeholder="Briefly describe your situation"
            aria-invalid={!!errors.situationDescription}
          />
          <FieldError errors={[errors.situationDescription]} />
        </Field>

        <Controller
          name="supportingDocuments"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Supporting Documents</FieldLabel>
              <FieldDescription>
                e.g. medical referral, proof of solo parenthood, hospital bill. Images or documents,
                max of 5 files.
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
                  {INDIGENCY_DELIVERY_METHODS.map((method) => (
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
