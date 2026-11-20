"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BusinessForm from "@/components/community-hub/forms/business-form";
import { updateBusiness } from "@/actions/business";
import { isAdminRole } from "@/lib/roles";
import { deleteRemovedFiles, uploadAddedFiles } from "@/lib/storage";
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
  const { user } = useUser();
  const isAdmin = isAdminRole(user?.publicMetadata?.role as string | undefined);

  // A resident's edit sends their business back to Pending, so they confirm it first if that
  // means losing its verification.
  const needsConfirmation = !isAdmin && business.status === "Verified";
  const [confirmingData, setConfirmingData] = useState<BusinessFormValues | null>(null);

  const {
    mutate: saveBusiness,
    mutateAsync: submitBusiness,
    isPending: isSaving,
  } = useMutation({
    mutationFn: async (data: BusinessFormValues) => {
      const uploadedPhotos = await uploadAddedFiles(data.photos ?? [], "community-hub/photos");
      const uploadedPermit = await uploadAddedFiles(data.permit, "community-hub/permits");

      await updateBusiness(business.id, {
        ...data,
        photos: uploadedPhotos,
        permit: uploadedPermit,
      });

      const cleanupResults = await Promise.all([
        deleteRemovedFiles(business.photos as MediaItem[], uploadedPhotos),
        deleteRemovedFiles(business.permit as MediaItem[], uploadedPermit),
        !isAdmin && business.status === "Rejected"
          ? deleteRemovedFiles(business.rejectionAttachments as MediaItem[], [])
          : Promise.resolve(false),
      ]);
      return cleanupResults.some(Boolean);
    },
    onSuccess: (cleanupFailed) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success("Business updated successfully.");
      if (cleanupFailed) toast.error("Some removed business files could not be deleted.");
      setConfirmingData(null);
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
          onSubmit={async (data) => {
            if (needsConfirmation) setConfirmingData(data);
            else await submitBusiness(data);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>

      <AlertDialog open={confirmingData !== null} onOpenChange={(open) => !open && setConfirmingData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your business for review again?</AlertDialogTitle>
            <AlertDialogDescription>
              Saving these changes will make &quot;{business.name}&quot; unverified again, and the barangay will
              need to review it before it&apos;s verified. Other residents won&apos;t see it in the Community Hub
              until then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(e) => {
                e.preventDefault();
                saveBusiness(confirmingData!);
              }}
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
