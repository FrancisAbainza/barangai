"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, parseDateValue, toDateValue } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  // "YYYY-MM-DD", or "" when no date is picked.
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Days that can't be picked, e.g. `{ before: today }`.
  disabledDays?: Matcher | Matcher[];
  // Clicking the picked day again clears an optional date; a required one keeps it.
  required?: boolean;
  // "dropdown" adds month and year dropdowns, for dates far from today like birthdates.
  captionLayout?: "label" | "dropdown";
  startMonth?: Date;
  endMonth?: Date;
  "aria-invalid"?: boolean;
  className?: string;
}

// The app's date input: a button showing the picked date that opens the shadcn calendar.
export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabledDays,
  required = false,
  captionLayout = "label",
  startMonth,
  endMonth,
  "aria-invalid": ariaInvalid,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseDateValue(value) : undefined;

  function select(date: Date | undefined) {
    setOpen(false);
    if (date) onChange(toDateValue(date));
    else if (!required) onChange("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={ariaInvalid}
          className={cn(
            "w-full justify-start font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          {selected
            ? selected.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={select}
          disabled={disabledDays}
          defaultMonth={selected}
          captionLayout={captionLayout}
          startMonth={startMonth}
          endMonth={endMonth}
        />
      </PopoverContent>
    </Popover>
  );
}
