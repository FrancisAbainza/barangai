"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  additionalTransactionsDocumentRequestFormSchema,
  ADDITIONAL_TRANSACTION_PURPOSES,
  ADDITIONAL_TRANSACTIONS_DELIVERY_METHODS,
  type AdditionalTransactionsDocumentRequestFormValues,
} from "@/schemas/additional-transactions-document-request-schema";
import { DEFAULT_GCASH_NUMBER } from "@/lib/barangay-data";
import {
  DEFAULT_ADDITIONAL_TRANSACTIONS_PURPOSE_FEES,
  PICKUP_DELIVERY_METHOD,
} from "@/lib/document-requests";
import { getBarangaySettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Send } from "lucide-react";
import PreferredClaimField from "./preferred-claim-field";
import FileUploader from "@/components/file-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdditionalTransactionsDocumentRequestFormProps {
  defaultValues?: Partial<AdditionalTransactionsDocumentRequestFormValues>;
  onSubmit: (data: AdditionalTransactionsDocumentRequestFormValues) => Promise<void>;
  onCancel?: () => void;
}

function formatFee(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const baseDefaults: AdditionalTransactionsDocumentRequestFormValues = {
  purpose: ADDITIONAL_TRANSACTION_PURPOSES[0],
  paymentReceipt: [],
  eligibleForFreeCertification: false,
  supportingDocuments: [],
  receiveVia: ADDITIONAL_TRANSACTIONS_DELIVERY_METHODS[0],
  preferredClaimAt: "",
};

export default function AdditionalTransactionsDocumentRequestForm({
  defaultValues,
  onSubmit,
  onCancel,
}: AdditionalTransactionsDocumentRequestFormProps) {
  const {
    control,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AdditionalTransactionsDocumentRequestFormValues>({
    resolver: zodResolver(additionalTransactionsDocumentRequestFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  const purpose = watch("purpose");
  const eligibleForFreeCertification = watch("eligibleForFreeCertification");
  const feeIsWaived = eligibleForFreeCertification;
  const isPickup = watch("receiveVia") === PICKUP_DELIVERY_METHOD;

  const { data: settings } = useQuery({
    queryKey: ["barangay-settings"],
    queryFn: () => getBarangaySettings(),
  });
  const gcashNumber = settings?.gcashNumber ?? DEFAULT_GCASH_NUMBER;
  const purposeFees = settings?.additionalTransactionsPurposeFees ?? DEFAULT_ADDITIONAL_TRANSACTIONS_PURPOSE_FEES;

  const feeLabel = (option: string) =>
    formatFee(purposeFees[option as keyof typeof purposeFees]);

  return (
    <form
      className="min-w-0"
      onSubmit={handleSubmit((data) =>
        onSubmit({
          ...data,
          paymentReceipt: data.eligibleForFreeCertification ? [] : data.paymentReceipt,
          supportingDocuments: data.eligibleForFreeCertification ? data.supportingDocuments : [],
        })
      )}
    >
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-4">
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
                  {ADDITIONAL_TRANSACTION_PURPOSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} — {feeLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Amount due: {feeIsWaived ? "Free" : feeLabel(purpose)}
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="eligibleForFreeCertification"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Are you eligible for a free certification?</FieldLabel>
              <FieldDescription>
                Free certification is available for PWDs, Senior Citizens, 4Ps beneficiaries,
                Solo Parents, and Pregnant Women.
              </FieldDescription>
              <Select
                value={field.value ? "yes" : "no"}
                onValueChange={(value) => field.onChange(value === "yes")}
              >
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {eligibleForFreeCertification && (
          <Controller
            name="supportingDocuments"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Supporting Documents</FieldLabel>
                <FieldDescription>
                  Upload proof of your eligibility, such as a PWD ID, Senior Citizen ID, 4Ps
                  certificate, Solo Parent ID, or proof of pregnancy. Images or documents, up to 5
                  files.
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
                  {ADDITIONAL_TRANSACTIONS_DELIVERY_METHODS.map((method) => (
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

        {!feeIsWaived && (
          <Controller
            name="paymentReceipt"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>
                  Payment Receipt (GCash Only)
                  {isPickup && (
                    <span className="font-normal text-muted-foreground"> (optional)</span>
                  )}
                </FieldLabel>
                <FieldDescription>
                  Send payment to GCash {gcashNumber}, then upload a screenshot of the receipt.
                  {isPickup && " For pickups, you can also pay when you claim the document."}
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
        )}

        {isPickup && (
          <Controller
            name="preferredClaimAt"
            control={control}
            render={({ field, fieldState }) => (
              <PreferredClaimField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error}
              />
            )}
          />
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
