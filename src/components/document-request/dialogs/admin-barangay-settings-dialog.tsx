"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { DocumentRequestSettingsFormValues } from "@/schemas/settings-schema";
import BarangaySettingsForm from "@/components/document-request/forms/barangay-settings-form";
import { getBarangaySettings, updateBarangaySettings } from "@/actions/settings";

interface AdminBarangaySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminBarangaySettingsDialog({
  open,
  onOpenChange,
}: AdminBarangaySettingsDialogProps) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["barangay-settings"],
    queryFn: () => getBarangaySettings(),
    enabled: open,
  });

  const { mutateAsync: saveSettings } = useMutation({
    mutationFn: (data: DocumentRequestSettingsFormValues) => updateBarangaySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barangay-settings"] });
      toast.success("Settings updated.");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update settings. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Document Request Settings</DialogTitle>
          <DialogDescription>
            Update the GCash number and clearance fees shown to residents on request forms.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !settings ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <BarangaySettingsForm
            key={JSON.stringify(settings)}
            defaultValues={settings}
            onSubmit={saveSettings}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
