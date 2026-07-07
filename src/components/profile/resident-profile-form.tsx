"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  residentProfileFormSchema,
  ResidentProfileFormValues,
  VALID_ID_TYPES,
} from "@/schemas/resident-profile-schema";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import FileUploader from "@/components/file-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResidentProfileFormProps {
  defaultValues?: Partial<ResidentProfileFormValues>;
  onSubmit: (data: ResidentProfileFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: ResidentProfileFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  birthdate: "",
  sex: "Male",
  civilStatus: "Single",
  contactNumber: "",
  address: "",
  validIdType: VALID_ID_TYPES[0],
  validIdFront: [],
  validIdBack: [],
};

export default function ResidentProfileForm({
  defaultValues,
  onSubmit,
  onCancel,
}: ResidentProfileFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResidentProfileFormValues>({
    resolver: zodResolver(residentProfileFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="firstName">First Name</FieldLabel>
            <Input
              {...register("firstName")}
              id="firstName"
              placeholder="Juan"
              aria-invalid={!!errors.firstName}
            />
            <FieldError errors={[errors.firstName]} />
          </Field>

          <Field data-invalid={!!errors.middleName}>
            <FieldLabel htmlFor="middleName">
              Middle Name{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </FieldLabel>
            <Input
              {...register("middleName")}
              id="middleName"
              placeholder="Santos"
              aria-invalid={!!errors.middleName}
            />
            <FieldError errors={[errors.middleName]} />
          </Field>

          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
            <Input
              {...register("lastName")}
              id="lastName"
              placeholder="Dela Cruz"
              aria-invalid={!!errors.lastName}
            />
            <FieldError errors={[errors.lastName]} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.birthdate}>
            <FieldLabel htmlFor="birthdate">Birthdate</FieldLabel>
            <Input
              {...register("birthdate")}
              id="birthdate"
              type="date"
              aria-invalid={!!errors.birthdate}
            />
            <FieldError errors={[errors.birthdate]} />
          </Field>

          <Controller
            name="sex"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Sex</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="civilStatus"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Civil Status</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select civil status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
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
              placeholder="09XX XXX XXXX"
              aria-invalid={!!errors.contactNumber}
            />
            <FieldError errors={[errors.contactNumber]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="address">Complete Address</FieldLabel>
          <Textarea
            {...register("address")}
            id="address"
            placeholder="House/Unit No., Street, Purok, Barangay Maduya"
            className="min-h-20 resize-none"
            aria-invalid={!!errors.address}
          />
          <FieldError errors={[errors.address]} />
        </Field>

        <Controller
          name="validIdType"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Valid ID Type</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_ID_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="validIdFront"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>
                  Valid ID Photo (Front){" "}
                  <span className="text-muted-foreground font-normal">(max 1)</span>
                </FieldLabel>
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
            name="validIdBack"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>
                  Valid ID Photo (Back){" "}
                  <span className="text-muted-foreground font-normal">
                    (optional, max 1)
                  </span>
                </FieldLabel>
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
        </div>

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
            ) : (
              <>
                <Save className="size-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
