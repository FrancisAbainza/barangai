"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BusinessForm from "@/components/community-hub/forms/business-form";
import { updateBusiness } from "@/actions/business";
import { uploadFile } from "@/lib/storage";
import type { BusinessFormValues } from "@/schemas/business-schema";
import type { Business } from "@/db/schema";
import type { MediaItem } from "@/components/file-uploader";

interface EditBusinessDialogProps {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditBusinessDialog({ business, open, onOpenChange }: EditBusinessDialogProps) {
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

      await updateBusiness(business.id, {
        ...data,
        photos: uploadedPhotos,
        permit: uploadedPermit,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success("Business updated successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update business. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Business</DialogTitle>
        </DialogHeader>

        <BusinessForm
          defaultValues={{
            name: business.name,
            description: business.description,
            category: business.category,
            contactNumber: business.contactNumber,
            socialMediaLink: business.socialMediaLink ?? "",
            operatingHours: business.operatingHours,
            photos: business.photos as MediaItem[],
            permit: business.permit as MediaItem[],
            location: business.location ?? undefined,
          }}
          onSubmit={submitBusiness}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
