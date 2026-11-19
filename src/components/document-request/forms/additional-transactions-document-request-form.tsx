"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import FileUploader, { type MediaItem } from "@/components/file-uploader";
import { getBarangaySettings } from "@/actions/settings";
import { DEFAULT_GCASH_NUMBER } from "@/lib/barangay-data";
import { PICKUP_DELIVERY_METHOD } from "@/lib/document-requests";
import { CLEARANCE_DELIVERY_METHODS } from "@/schemas/clearance-document-request-schema";
import PreferredClaimField from "./preferred-claim-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const transactionPurposes = [
  { name: "Tel. Net. Tower", fee: 5030 },
  { name: "Fiber Optic Cable", fee: 2030 },
] as const;

type TransactionPurpose = (typeof transactionPurposes)[number]["name"];

export interface AdditionalTransactionsDocumentRequestFormValues {
  purpose: TransactionPurpose;
  eligibleForFreeCertification: boolean;
  paymentReceipt: MediaItem[];
  supportingDocuments: MediaItem[];
  receiveVia: (typeof CLEARANCE_DELIVERY_METHODS)[number];
  preferredClaimAt: string;
}

interface AdditionalTransactionsDocumentRequestFormProps {
  defaultValues?: Partial<AdditionalTransactionsDocumentRequestFormValues>;
  onCancel: () => void;
}

const baseDefaults: AdditionalTransactionsDocumentRequestFormValues = {
  purpose: transactionPurposes[0].name,
  eligibleForFreeCertification: false,
  paymentReceipt: [],
  supportingDocuments: [],
  receiveVia: CLEARANCE_DELIVERY_METHODS[0],
  preferredClaimAt: "",
};

function isTransactionPurpose(value: string): value is TransactionPurpose {
  return transactionPurposes.some((item) => item.name === value);
}

function formatFee(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function AdditionalTransactionsDocumentRequestForm({
  defaultValues,
  onCancel,
}: AdditionalTransactionsDocumentRequestFormProps) {
  const { control } = useForm<AdditionalTransactionsDocumentRequestFormValues>({
    defaultValues: { ...baseDefaults, ...defaultValues },
  });
  const purpose = useWatch({ control, name: "purpose" });
  const eligibleForFreeCertification = useWatch({
    control,
    name: "eligibleForFreeCertification",
  });
  const isPickup = useWatch({ control, name: "receiveVia" }) === PICKUP_DELIVERY_METHOD;
  const selectedPurpose =
    purpose === transactionPurposes[0].name ? transactionPurposes[0] : transactionPurposes[1];

  const { data: settings } = useQuery({
    queryKey: ["barangay-settings"],
    queryFn: () => getBarangaySettings(),
  });
  const gcashNumber = settings?.gcashNumber ?? DEFAULT_GCASH_NUMBER;

  return (
    <form className="min-w-0" onSubmit={(event) => event.preventDefault()}>
      <fieldset className="space-y-4">
        <Controller
          name="purpose"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Purpose</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (isTransactionPurpose(value)) field.onChange(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {transactionPurposes.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.name} — {formatFee(item.fee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Amount due:{" "}
                {eligibleForFreeCertification ? "Free" : formatFee(selectedPurpose.fee)}
              </FieldDescription>
            </Field>
          )}
        />

        <Controller
          name="eligibleForFreeCertification"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Are you eligible for a free certification?</FieldLabel>
              <FieldDescription>
                Free certification is available for PWDs, Senior Citizens, 4Ps beneficiaries, Solo
                Parents, and Pregnant Women.
              </FieldDescription>
              <Select
                value={field.value ? "yes" : "no"}
                onValueChange={(value) => field.onChange(value === "yes")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <Controller
          name="receiveVia"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Receive Document Via</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
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
            </Field>
          )}
        />

        {eligibleForFreeCertification ? (
          <Controller
            name="supportingDocuments"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Supporting Documents</FieldLabel>
                <FieldDescription>
                  Upload proof of eligibility, such as a PWD ID, Senior Citizen ID, 4Ps certificate,
                  Solo Parent ID, or proof of pregnancy. Images or documents, up to 5 files.
                </FieldDescription>
                <FileUploader
                  files={field.value}
                  onFilesChange={field.onChange}
                  maxFiles={5}
                  accept={["images", "documents"]}
                />
              </Field>
            )}
          />
        ) : (
          <Controller
            name="paymentReceipt"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>
                  Payment Receipt (GCash Only)
                  {isPickup && (
                    <span className="font-normal text-muted-foreground"> (optional)</span>
                  )}
                </FieldLabel>
                <FieldDescription>
                  Send {formatFee(selectedPurpose.fee)} to GCash {gcashNumber}, then upload a
                  screenshot of the receipt.
                  {isPickup && " For pickups, you can also pay when you claim the document."}
                </FieldDescription>
                <FileUploader
                  files={field.value}
                  onFilesChange={field.onChange}
                  maxFiles={1}
                  accept={["images"]}
                />
              </Field>
            )}
          />
        )}

        {isPickup && (
          <Controller
            name="preferredClaimAt"
            control={control}
            render={({ field }) => (
              <PreferredClaimField value={field.value} onChange={field.onChange} />
            )}
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Request submission will be available soon.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled>
              <Send className="size-4" />
              Submit Request
            </Button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
