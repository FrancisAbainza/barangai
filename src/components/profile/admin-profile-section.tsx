"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateAdminProfile } from "@/actions/resident-profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  adminProfileFormSchema,
  type AdminProfileFormValues,
} from "@/schemas/admin-profile-schema";

interface AdminProfileSectionProps {
  firstName: string;
  lastName: string;
}

export default function AdminProfileSection({
  firstName,
  lastName,
}: AdminProfileSectionProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminProfileFormValues>({
    resolver: zodResolver(adminProfileFormSchema),
    defaultValues: { firstName, lastName },
  });

  const { mutateAsync: submitProfile, isPending } = useMutation({
    mutationFn: updateAdminProfile,
    onSuccess: () => {
      toast.success("Profile updated successfully.");
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to update profile. Please try again.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Profile</CardTitle>
        <CardDescription>Update the first and last name on your admin account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((values) => submitProfile(values))}>
          <fieldset disabled={isPending} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="admin-firstName">First Name</FieldLabel>
                <Input
                  {...register("firstName")}
                  id="admin-firstName"
                  placeholder="Juan"
                  aria-invalid={!!errors.firstName}
                />
                <FieldError errors={[errors.firstName]} />
              </Field>

              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="admin-lastName">Last Name</FieldLabel>
                <Input
                  {...register("lastName")}
                  id="admin-lastName"
                  placeholder="Dela Cruz"
                  aria-invalid={!!errors.lastName}
                />
                <FieldError errors={[errors.lastName]} />
              </Field>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
