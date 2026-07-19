"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  clearanceDocumentRequestFormSchema,
  ClearanceDocumentRequestFormValues,
  CLEARANCE_PURPOSES,
  CLEARANCE_DELIVERY_METHODS,
} from "@/schemas/clearance-document-request-schema";
import { DEFAULT_CLEARANCE_PURPOSE_FEES, DEFAULT_GCASH_NUMBER, GCASH_ACCOUNT_NAME } from "@/lib/data";
import { getBarangaySettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Send } from "lucide-react";
import FileUploader from "@/components/file-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClearanceDocumentRequestFormProps {
  defaultValues?: Partial<ClearanceDocumentRequestFormValues>;
  onSubmit: (data: ClearanceDocumentRequestFormValues) => Promise<void>;
  onCancel?: () => void;
}

function formatFee(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const baseDefaults: ClearanceDocumentRequestFormValues = {
  purpose: CLEARANCE_PURPOSES[0],
  paymentReceipt: [],
  receiveVia: CLEARANCE_DELIVERY_METHODS[0],
};

export default function ClearanceDocumentRequestForm({
  defaultValues,
  onSubmit,
  onCancel,
}: ClearanceDocumentRequestFormProps) {
  const {
    control,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ClearanceDocumentRequestFormValues>({
    resolver: zodResolver(clearanceDocumentRequestFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  const purpose = watch("purpose");

  const { data: settings } = useQuery({
    queryKey: ["barangay-settings"],
    queryFn: () => getBarangaySettings(),
  });
  const gcashNumber = settings?.gcashNumber ?? DEFAULT_GCASH_NUMBER;
  const purposeFees = settings?.clearancePurposeFees ?? DEFAULT_CLEARANCE_PURPOSE_FEES;

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
                  {CLEARANCE_PURPOSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} — {formatFee(purposeFees[option])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Amount due: {formatFee(purposeFees[purpose])}
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="paymentReceipt"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Payment Receipt (GCash Only)</FieldLabel>
              <FieldDescription>
                Send payment to GCash {gcashNumber} ({GCASH_ACCOUNT_NAME}), then upload a
                screenshot of the receipt.
              </FieldDescription>
              <FileUploader
                files={field.value}
                onFilesChange={field.onChange}
                maxFiles={1}
                accept={["images"]}
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
                  {CLEARANCE_DELIVERY_METHODS.map((method) => (
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
