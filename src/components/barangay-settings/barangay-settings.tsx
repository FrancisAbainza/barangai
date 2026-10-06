"use client";

import { Landmark, ReceiptText, SportShoe, Target, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import OfficialsGrid from "@/components/about-us/officials-grid";
import CourtFeesForm from "@/components/barangay-settings/forms/court-fees-form";
import DocumentPricingForm from "@/components/barangay-settings/forms/document-pricing-form";
import MissionVisionForm from "@/components/barangay-settings/forms/mission-vision-form";
import { getBarangaySettings, updateBarangaySettings, type BarangaySettingsValues } from "@/actions/settings";

function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function BarangaySettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["barangay-settings"],
    queryFn: () => getBarangaySettings(),
  });

  const { mutateAsync: saveSettings } = useMutation({
    mutationFn: (data: Partial<BarangaySettingsValues>) => updateBarangaySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barangay-settings"] });
      toast.success("Settings updated.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update settings. Please try again.");
    },
  });

  // Each form is keyed on only the fields it owns, so saving one section (which refetches
  // the shared settings row) doesn't reset unsaved edits in the other.
  const pricing = settings && {
    gcashNumber: settings.gcashNumber,
    clearancePurposeFees: settings.clearancePurposeFees,
  };
  const courtFees = settings && {
    courtDayRate: settings.courtDayRate,
    courtNightRate: settings.courtNightRate,
  };
  const missionVision = settings && { mission: settings.mission, vision: settings.vision };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="rounded-md bg-accent p-2 text-primary [&_svg]:size-5">
            <ReceiptText />
          </div>
          <div>
            <CardTitle className="text-lg">Document Pricing</CardTitle>
            <CardDescription>
              The clearance fees shown to residents on request forms, and the GCash number used for
              both document and court reservation payments.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !pricing ? (
            <FormSkeleton fields={4} />
          ) : (
            <DocumentPricingForm
              key={JSON.stringify(pricing)}
              defaultValues={pricing}
              onSubmit={async (data) => {
                await saveSettings(data);
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="rounded-md bg-accent p-2 text-primary [&_svg]:size-5">
            <SportShoe />
          </div>
          <div>
            <CardTitle className="text-lg">Court Reservation Fees</CardTitle>
            <CardDescription>The hourly rates shown to residents when reserving the court.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !courtFees ? (
            <FormSkeleton fields={2} />
          ) : (
            <CourtFeesForm
              key={JSON.stringify(courtFees)}
              defaultValues={courtFees}
              onSubmit={async (data) => {
                await saveSettings(data);
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="rounded-md bg-accent p-2 text-primary [&_svg]:size-5">
            <Target />
          </div>
          <div>
            <CardTitle className="text-lg">Mission & Vision</CardTitle>
            <CardDescription>The barangay&apos;s mission and vision shown on the About Us page.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !missionVision ? (
            <FormSkeleton fields={2} />
          ) : (
            <MissionVisionForm
              key={JSON.stringify(missionVision)}
              defaultValues={missionVision}
              onSubmit={async (data) => {
                await saveSettings(data);
              }}
            />
          )}
        </CardContent>
      </Card>

      <OfficialsGrid
        title="Barangay Officials"
        icon={<Landmark />}
        addLabel="Add Official"
        section="barangay"
        isAdmin
      />

      <OfficialsGrid
        title="Sangguniang Kabataan"
        icon={<Users />}
        addLabel="Add SK"
        section="sk"
        isAdmin
      />
    </div>
  );
}
