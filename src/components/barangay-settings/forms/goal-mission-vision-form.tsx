"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { goalMissionVisionFormSchema, GoalMissionVisionFormValues } from "@/schemas/settings-schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Save } from "lucide-react";

interface GoalMissionVisionFormProps {
  defaultValues: GoalMissionVisionFormValues;
  onSubmit: (data: GoalMissionVisionFormValues) => Promise<void>;
}

export default function GoalMissionVisionForm({ defaultValues, onSubmit }: GoalMissionVisionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalMissionVisionFormValues>({
    resolver: zodResolver(goalMissionVisionFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <Field data-invalid={!!errors.goal}>
          <FieldLabel htmlFor="goal">Goal</FieldLabel>
          <FieldDescription>Shown on the About Us page.</FieldDescription>
          <Textarea
            {...register("goal")}
            id="goal"
            rows={4}
            aria-invalid={!!errors.goal}
          />
          <FieldError errors={[errors.goal]} />
        </Field>

        <Field data-invalid={!!errors.mission}>
          <FieldLabel htmlFor="mission">Mission</FieldLabel>
          <FieldDescription>Shown on the About Us page.</FieldDescription>
          <Textarea
            {...register("mission")}
            id="mission"
            rows={4}
            aria-invalid={!!errors.mission}
          />
          <FieldError errors={[errors.mission]} />
        </Field>

        <Field data-invalid={!!errors.vision}>
          <FieldLabel htmlFor="vision">Vision</FieldLabel>
          <FieldDescription>Shown on the About Us page.</FieldDescription>
          <Textarea
            {...register("vision")}
            id="vision"
            rows={4}
            aria-invalid={!!errors.vision}
          />
          <FieldError errors={[errors.vision]} />
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
                Save Goal, Mission & Vision
              </>
            )}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
