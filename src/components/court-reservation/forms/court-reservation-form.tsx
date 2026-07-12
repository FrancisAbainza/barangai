"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  courtReservationFormSchema,
  CourtReservationFormValues,
} from "@/schemas/court-reservation-schema";
import { COURT_DAY_RATE, COURT_NIGHT_RATE, GCASH_ACCOUNT_NAME, GCASH_NUMBER, getCourtRateForHour } from "@/lib/data";
import { COURT_TIME_SLOTS, formatFee } from "@/lib/court-reservations";
import { cn } from "@/lib/utils";
import { getTakenTimeSlots } from "@/actions/court-reservations";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import FileUploader from "@/components/file-uploader";

interface CourtReservationFormProps {
  defaultValues?: Partial<CourtReservationFormValues>;
  onSubmit: (data: CourtReservationFormValues) => Promise<void>;
  onCancel?: () => void;
}

const COURT_DAY_HOURS = "6:00 AM - 6:00 PM";
const COURT_NIGHT_HOURS = "6:00 PM - 6:00 AM";

const baseDefaults: CourtReservationFormValues = {
  date: "",
  purpose: "",
  timeSlots: [],
  gcashPayment: [],
};

const todayIso = new Date().toISOString().split("T")[0];

export default function CourtReservationForm({
  defaultValues,
  onSubmit,
  onCancel,
}: CourtReservationFormProps) {
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourtReservationFormValues>({
    resolver: zodResolver(courtReservationFormSchema),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  const date = watch("date");
  const selectedTimeSlots = watch("timeSlots");
  const totalAmount = selectedTimeSlots.reduce((sum, hour) => sum + getCourtRateForHour(hour), 0);

  const { data: takenSlots = [] } = useQuery({
    queryKey: ["court-reservation-taken-slots", date],
    queryFn: () => getTakenTimeSlots(date),
    enabled: !!date,
  });

  useEffect(() => {
    if (selectedTimeSlots.some((hour) => takenSlots.includes(hour))) {
      setValue(
        "timeSlots",
        selectedTimeSlots.filter((hour) => !takenSlots.includes(hour))
      );
    }
    // Only react to takenSlots changing (e.g. after picking a new date); selectedTimeSlots is
    // intentionally excluded to avoid re-filtering on every manual toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takenSlots]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.date}>
          <FieldLabel htmlFor="date">Date</FieldLabel>
          <Input
            {...register("date")}
            id="date"
            type="date"
            min={todayIso}
            aria-invalid={!!errors.date}
          />
          <FieldError errors={[errors.date]} />
        </Field>

        <Field data-invalid={!!errors.purpose}>
          <FieldLabel htmlFor="purpose">Purpose</FieldLabel>
          <Input
            {...register("purpose")}
            id="purpose"
            placeholder="e.g. Basketball practice, Barangay event"
            aria-invalid={!!errors.purpose}
          />
          <FieldError errors={[errors.purpose]} />
        </Field>

        <Controller
          name="timeSlots"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Time Slots</FieldLabel>
              <FieldDescription>
                {COURT_DAY_HOURS}: {formatFee(COURT_DAY_RATE)}/hour &middot; {COURT_NIGHT_HOURS}:{" "}
                {formatFee(COURT_NIGHT_RATE)}/hour. Select one or more 1-hour slots.
                {!date && " Pick a date first to see availability."}
              </FieldDescription>
              <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-3">
                {COURT_TIME_SLOTS.map((slot) => {
                  const isSelected = field.value.includes(slot.hour);
                  const isTaken = takenSlots.includes(slot.hour);
                  return (
                    <button
                      key={slot.hour}
                      type="button"
                      disabled={isTaken}
                      onClick={() =>
                        field.onChange(
                          isSelected
                            ? field.value.filter((hour) => hour !== slot.hour)
                            : [...field.value, slot.hour]
                        )
                      }
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs transition-colors",
                        isTaken
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                          : isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted/50"
                      )}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium">Total Amount Due</span>
          <span className="text-lg font-semibold">{formatFee(totalAmount)}</span>
        </div>

        <Controller
          name="gcashPayment"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>GCash Payment</FieldLabel>
              <FieldDescription>
                Send {formatFee(totalAmount)} to GCash {GCASH_NUMBER} ({GCASH_ACCOUNT_NAME}), then
                upload a screenshot of the receipt.
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
                Reserve Court
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
