"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Clock, MapPin, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import BusinessActionsMenu from "@/components/community-hub/business-actions-menu";
import ViewBusinessDialog from "@/components/community-hub/dialogs/view-business-dialog";
import { fetchFile } from "@/lib/storage";
import { formatOperatingHours, statusBadgeVariant } from "@/lib/business";
import type { BusinessWithOwner } from "@/actions/business";
import type { MediaItem } from "@/components/file-uploader";

export default function BusinessCard({ business }: { business: BusinessWithOwner }) {
  const [viewOpen, setViewOpen] = useState(false);
  const { user } = useUser();
  const isOwnBusiness = business.ownerId === user?.id;

  const photos = business.photos as MediaItem[];
  const cover = photos.find((item) => item.type === "image" && item.key);

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setViewOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setViewOpen(true);
        }}
        className="overflow-hidden py-0 gap-0 cursor-pointer transition-colors hover:bg-accent/50"
      >
        <div className="relative aspect-video w-full shrink-0 bg-muted">
          {cover ? (
            <Image
              src={fetchFile(cover.key!)}
              alt={business.name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Store className="size-8 text-muted-foreground" />
            </div>
          )}
          {isOwnBusiness && <Badge className="absolute right-2 top-2">Your Business</Badge>}
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{business.name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{business.category}</Badge>
                {isOwnBusiness && business.status !== "Verified" && (
                  <Badge variant={statusBadgeVariant(business.status)}>{business.status}</Badge>
                )}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <BusinessActionsMenu business={business} />
            </div>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">{business.description}</p>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" />
              <span className="truncate">{business.contactNumber}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              <span className="truncate">{formatOperatingHours(business.operatingHours)}</span>
            </div>
            {business.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{business.location.address || "Address unavailable"}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ViewBusinessDialog business={business} open={viewOpen} onOpenChange={setViewOpen} />
    </>
  );
}
