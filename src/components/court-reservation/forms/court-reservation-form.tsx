"use client";

import { useUser } from "@clerk/nextjs";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  getCourtReservationFormSchema,
  CourtReservationFormValues,
} from "@/schemas/court-reservation-schema";
import {
  DEFAULT_COURT_DAY_RATE,
  DEFAULT_COURT_NIGHT_RATE,
  DEFAULT_GCASH_NUMBER,
  GCASH_ACCOUNT_NAME,
} from "@/lib/data";
import {
  COURT_DAY_HOURS,
  COURT_NIGHT_HOURS,
  formatCourtTime,
  formatFee,
  formatTimeRange,
  getCourtHourCharges,
  maxDurationHours,
  MINUTES_PER_DAY,
  parseTimeInput,
  rangesOverlap,
} from "@/lib/court-reservations";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@/lib/roles";
import { getTakenTimeRanges } from "@/actions/court-reservations";
import { getBarangaySettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import FileUploader from "@/components/file-uploader";

interface CourtReservationFormProps {
  defaultValues?: Partial<CourtReservationFormValues>;
  onSubmit: (data: CourtReservationFormValues) => Promise<void>;
  onCancel?: () => void;
}

const baseDefaults: CourtReservationFormValues = {
  date: "",
  purpose: "",
  startTime: "",
  durationHours: 1,
  gcashPayment: [],
};

const todayIso = new Date().toISOString().split("T")[0];

export default function CourtReservationForm({
  defaultValues,
  onSubmit,
  onCancel,
}: CourtReservationFormProps) {
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  const {
    register,
    control,
    watch,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourtReservationFormValues>({
    resolver: zodResolver(getCourtReservationFormSchema(isAdmin)),
    defaultValues: { ...baseDefaults, ...defaultValues },
  });

  const date = watch("date");
  const startTimeInput = watch("startTime");
  const durationHours = watch("durationHours");
  const startTime = parseTimeInput(startTimeInput);

  const { data: takenRanges = [] } = useQuery({
    queryKey: ["court-reservation-taken-ranges", date],
    queryFn: () => getTakenTimeRanges(date),
    enabled: !!date,
  });

  const { data: settings } = useQuery({
    queryKey: ["barangay-settings"],
    queryFn: () => getBarangaySettings(),
  });
  const gcashNumber = settings?.gcashNumber ?? DEFAULT_GCASH_NUMBER;
  const dayRate = settings?.courtDayRate ?? DEFAULT_COURT_DAY_RATE;
  const nightRate = settings?.courtNightRate ?? DEFAULT_COURT_NIGHT_RATE;

  const durationOptions = Array.from(
    { length: startTime === null ? 24 : maxDurationHours(startTime) },
    (_, i) => i + 1
  );
  const selectedRange =
    startTime !== null && startTime + durationHours * 60 <= MINUTES_PER_DAY
      ? { start: startTime, end: startTime + durationHours * 60 }
      : null;
  const charges = selectedRange
    ? getCourtHourCharges(selectedRange.start, durationHours, dayRate, nightRate)
    : [];
  const totalAmount = charges.reduce((sum, charge) => sum + charge.rate, 0);
  const conflict = selectedRange
    ? takenRanges.find((taken) => rangesOverlap(selectedRange, taken))
    : undefined;

  async function submit(values: CourtReservationFormValues) {
    if (conflict) {
      setError("startTime", {
        message: `This overlaps an existing reservation (${formatTimeRange(conflict)}).`,
      });
      return;
    }
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit(submit)}>
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

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!errors.startTime}>
              <FieldLabel htmlFor="startTime">Start Time</FieldLabel>
              <Input
                {...register("startTime")}
                id="startTime"
                type="time"
                aria-invalid={!!errors.startTime}
              />
            </Field>

            <Controller
              name="durationHours"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="durationHours">Duration</FieldLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <SelectTrigger
                      id="durationHours"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((hours) => (
                        <SelectItem key={hours} value={String(hours)}>
                          {hours} {hours === 1 ? "hour" : "hours"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <FieldDescription>
            {COURT_DAY_HOURS}: {formatFee(dayRate)}/hour &middot; {COURT_NIGHT_HOURS}:{" "}
            {formatFee(nightRate)}/hour. Start at any minute and book whole hours, ending by
            midnight. An hour that crosses 6:00 AM or 6:00 PM is charged the day rate if at least
            30 minutes of it is daytime.
          </FieldDescription>

          {selectedRange && (
            <p className="text-sm">
              Ends at <span className="font-medium">{formatCourtTime(selectedRange.end)}</span>
            </p>
          )}

          {date ? (
            takenRanges.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Already booked on this date: {takenRanges.map(formatTimeRange).join(", ")}
              </p>
            )
          ) : (
            <p className="text-xs text-muted-foreground">Pick a date first to see availability.</p>
          )}

          {conflict && !errors.startTime && (
            <p role="alert" className="text-sm text-destructive">
              This overlaps an existing reservation ({formatTimeRange(conflict)}).
            </p>
          )}
          <FieldError errors={[errors.startTime, errors.durationHours]} />
        </div>

        {charges.length > 0 && (
          <ul className="space-y-1 rounded-lg border p-3 text-xs">
            {charges.map((charge) => (
              <li key={charge.start} className="flex items-center justify-between gap-2">
                <span>{formatTimeRange(charge)}</span>
                <span className={cn("text-muted-foreground", !charge.isDayRate && "font-medium")}>
                  {charge.isDayRate ? "Day" : "Night"} rate &middot; {formatFee(charge.rate)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium">Total Amount Due</span>
          <span className="text-lg font-semibold">{formatFee(totalAmount)}</span>
        </div>

        <Controller
          name="gcashPayment"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>
                GCash Payment
                {isAdmin && (
                  <span className="font-normal text-muted-foreground"> (optional)</span>
                )}
              </FieldLabel>
              <FieldDescription>
                Send {formatFee(totalAmount)} to GCash {gcashNumber} ({GCASH_ACCOUNT_NAME}), then
                upload a screenshot of the receipt.
                {isAdmin && " Not required for admin-created reservations."}
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
