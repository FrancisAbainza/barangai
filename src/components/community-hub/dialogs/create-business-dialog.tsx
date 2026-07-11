"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";
import { Store } from "lucide-react";
import { BusinessFormValues } from "@/schemas/business-schema";
import BusinessForm from "../forms/business-form";
import { toast } from "sonner";
import { uploadFile } from "@/lib/storage";
import { createBusiness } from "@/actions/business";
import { getResidentProfile } from "@/actions/resident-profile";

export default function CreateBusinessDialog() {
  const [open, setOpen] = useState(false);

  const { user } = useUser();
  const { data: residentProfile, isLoading: isResidentProfileLoading } = useQuery({
    queryKey: ["resident-profile", user?.id],
    queryFn: () => getResidentProfile(user!.id),
    enabled: !!user?.id,
  });

  const queryClient = useQueryClient();

  const { mutateAsync: submitBusiness } = useMutation({
    mutationFn: async (data: BusinessFormValues) => {
      const uploadedPhotos = await Promise.all(
        (data.photos ?? []).map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "community-hub/photos");
          return { ...item, key, file: undefined };
        })
      );

      const uploadedPermit = await Promise.all(
        data.permit.map(async (item) => {
          if (!item.file) return item;
          const key = await uploadFile(item.file, "community-hub/permits");
          return { ...item, key, file: undefined };
        })
      );

      await createBusiness({
        ...data,
        photos: uploadedPhotos,
        permit: uploadedPermit,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success("Business submitted successfully.");
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to submit business. Please try again.");
    },
  });

  const canSubmit = !isResidentProfileLoading && !!residentProfile;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-col gap-1 shrink-0">
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2" disabled={!canSubmit}>
            <Store className="size-4" />
            Add Business
          </Button>
        </DialogTrigger>
        {!isResidentProfileLoading && !residentProfile && (
          <Link
            href={`/portal/profile/${user?.id}`}
            className="self-center text-xs text-primary underline underline-offset-4"
          >
            Fill up your Resident Credentials first.
          </Link>
        )}
      </div>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Your Business</DialogTitle>
        </DialogHeader>

        <BusinessForm onSubmit={submitBusiness} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
