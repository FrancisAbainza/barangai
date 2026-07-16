"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import MediaLightbox from "@/components/media-lightbox";
import { fetchFile } from "@/lib/storage";
import type { ResidentProfile } from "@/db/schema";
import type { MediaItem } from "@/components/file-uploader";

function ValidIdPreview({ label, item }: { label: string; item: MediaItem | undefined }) {
  if (!item?.key) return null;
  const url = fetchFile(item.key);

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <MediaLightbox src={url} alt={label} className="w-full">
        <div className="relative aspect-video w-full overflow-hidden rounded-md border">
          <Image src={url} alt={label} fill sizes="240px" className="object-cover" unoptimized />
        </div>
      </MediaLightbox>
    </Field>
  );
}

export default function ResidentProfileView({ profile }: { profile: ResidentProfile }) {
  const validIdFront = (profile.validIdFront as MediaItem[])[0];
  const validIdBack = (profile.validIdBack as MediaItem[])[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resident Credentials</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>First Name</FieldLabel>
            <p className="text-sm">{profile.firstName}</p>
          </Field>
          <Field>
            <FieldLabel>Middle Name</FieldLabel>
            <p className="text-sm">{profile.middleName || "—"}</p>
          </Field>
          <Field>
            <FieldLabel>Last Name</FieldLabel>
            <p className="text-sm">{profile.lastName}</p>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Birthdate</FieldLabel>
            <p className="text-sm">{profile.birthdate}</p>
          </Field>
          <Field>
            <FieldLabel>Sex</FieldLabel>
            <p className="text-sm">{profile.sex}</p>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Civil Status</FieldLabel>
            <p className="text-sm">{profile.civilStatus}</p>
          </Field>
          <Field>
            <FieldLabel>Contact Number</FieldLabel>
            <p className="text-sm">{profile.contactNumber}</p>
          </Field>
        </div>

        <Field>
          <FieldLabel>Complete Address</FieldLabel>
          <p className="text-sm">{profile.address}</p>
        </Field>

        <Field>
          <FieldLabel>Valid ID Type</FieldLabel>
          <p className="text-sm">{profile.validIdType}</p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <ValidIdPreview label="Valid ID Photo (Front)" item={validIdFront} />
          <ValidIdPreview label="Valid ID Photo (Back)" item={validIdBack} />
        </div>
      </CardContent>
    </Card>
  );
}
