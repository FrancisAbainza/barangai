"use client";

import ResidentProfileForm from "@/components/profile/resident-profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResidentProfileFormValues } from "@/schemas/resident-profile-schema";
import type { MediaItem } from "@/components/media-uploader";
import { uploadFile, deleteFile } from "@/lib/storage";
import { saveResidentProfile } from "@/actions/resident-profile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ResidentProfileSectionProps {
  userId: string;
  defaultValues?: Partial<ResidentProfileFormValues>;
}

export default function ResidentProfileSection({
  userId,
  defaultValues,
}: ResidentProfileSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const syncMedia = async (items: MediaItem[], original: MediaItem[]) => {
    const uploaded: MediaItem[] = await Promise.all(
      items.map(async (item) => {
        if (!item.file) return item;
        const key = await uploadFile(item.file, "profile/valid-id");
        return { ...item, key, file: undefined };
      })
    );

    const originalKeys = original.map((item) => item.key).filter(Boolean);
    const finalKeys = new Set(uploaded.map((item) => item.key).filter(Boolean));
    const removedKeys = originalKeys.filter((key) => !finalKeys.has(key));
    await Promise.all(removedKeys.map((key) => deleteFile(key!)));

    return uploaded;
  };

  const { mutateAsync: submitProfile } = useMutation({
    mutationFn: async (data: ResidentProfileFormValues) => {
      const uploadedValidIdFront = await syncMedia(
        data.validIdFront,
        (defaultValues?.validIdFront as MediaItem[]) ?? []
      );
      const uploadedValidIdBack = await syncMedia(
        data.validIdBack ?? [],
        (defaultValues?.validIdBack as MediaItem[]) ?? []
      );

      await saveResidentProfile(userId, {
        ...data,
        validIdFront: uploadedValidIdFront,
        validIdBack: uploadedValidIdBack,
      });
    },
    onSuccess: () => {
      toast.success("Profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["resident-profile", userId] });
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to update profile. Please try again.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resident Credentials</CardTitle>
        <CardDescription>
          Keep this information up to date. It will be used to verify your
          identity when you request documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResidentProfileForm onSubmit={submitProfile} defaultValues={defaultValues} />
      </CardContent>
    </Card>
  );
}
