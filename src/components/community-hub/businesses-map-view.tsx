"use client";

import { useState } from "react";
import Image from "next/image";
import { APIProvider, AdvancedMarker, InfoWindow, Map, Pin } from "@vis.gl/react-google-maps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ViewBusinessDialog from "@/components/community-hub/dialogs/view-business-dialog";
import { cn } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import MaduyaBoundaryOverlay from "@/components/maduya-boundary-overlay";
import CurrentLocationControl from "@/components/current-location-control";
import type { BusinessWithOwner } from "@/actions/business";
import type { Business } from "@/db/schema";
import type { LocationValue } from "@/components/map-picker";
import type { MediaItem } from "@/components/file-uploader";

// Roughly central Metro Manila; used only as a fallback when there are no businesses to center on.
const DEFAULT_CENTER = { lat: 14.317511, lng: 121.059571 };

const CATEGORY_PIN_COLORS: Record<
  Business["category"],
  { background: string; borderColor: string; glyphColor: string; badgeClassName: string }
> = {
  "Food & Beverage": {
    background: "#ea580c",
    borderColor: "#c2410c",
    glyphColor: "#7c2d12",
    badgeClassName: "bg-orange-600 text-white hover:bg-orange-600",
  },
  Retail: {
    background: "#db2777",
    borderColor: "#be185d",
    glyphColor: "#831843",
    badgeClassName: "bg-pink-600 text-white hover:bg-pink-600",
  },
  Services: {
    background: "#2563eb",
    borderColor: "#1d4ed8",
    glyphColor: "#1e3a8a",
    badgeClassName: "bg-blue-600 text-white hover:bg-blue-600",
  },
  "Health & Wellness": {
    background: "#dc2626",
    borderColor: "#b91c1c",
    glyphColor: "#7f1d1d",
    badgeClassName: "bg-red-600 text-white hover:bg-red-600",
  },
  "Beauty & Personal Care": {
    background: "#c026d3",
    borderColor: "#a21caf",
    glyphColor: "#701a75",
    badgeClassName: "bg-fuchsia-600 text-white hover:bg-fuchsia-600",
  },
  Education: {
    background: "#4f46e5",
    borderColor: "#4338ca",
    glyphColor: "#312e81",
    badgeClassName: "bg-indigo-600 text-white hover:bg-indigo-600",
  },
  Automotive: {
    background: "#475569",
    borderColor: "#334155",
    glyphColor: "#0f172a",
    badgeClassName: "bg-slate-600 text-white hover:bg-slate-600",
  },
  Agriculture: {
    background: "#16a34a",
    borderColor: "#15803d",
    glyphColor: "#14532d",
    badgeClassName: "bg-green-600 text-white hover:bg-green-600",
  },
  Technology: {
    background: "#0891b2",
    borderColor: "#0e7490",
    glyphColor: "#164e63",
    badgeClassName: "bg-cyan-600 text-white hover:bg-cyan-600",
  },
  Others: {
    background: "#4b5563",
    borderColor: "#374151",
    glyphColor: "#111827",
    badgeClassName: "bg-gray-600 text-white hover:bg-gray-600",
  },
};

type LocatedBusiness = BusinessWithOwner & { location: LocationValue };

export default function BusinessesMapView({ businesses }: { businesses: LocatedBusiness[] }) {
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const activeBusiness = businesses.find((business) => business.id === activeBusinessId) ?? null;
  const activeBusinessPhoto = (activeBusiness?.photos as MediaItem[] | undefined)?.find(
    (item) => item.type === "image" && item.key
  );

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {(Object.keys(CATEGORY_PIN_COLORS) as Business["category"][]).map((category) => (
          <div key={category} className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-full border"
              style={{
                backgroundColor: CATEGORY_PIN_COLORS[category].background,
                borderColor: CATEGORY_PIN_COLORS[category].borderColor,
              }}
            />
            <span>{category}</span>
          </div>
        ))}
      </div>

      <div className="h-128 w-full overflow-hidden rounded-lg border md:h-160">
        <Map
          defaultZoom={15}
          defaultCenter={businesses[0]?.location.coordinates ?? DEFAULT_CENTER}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          gestureHandling="greedy"
        >
          <MaduyaBoundaryOverlay />

          {businesses.map((business) => (
            <AdvancedMarker
              key={business.id}
              position={business.location.coordinates}
              onClick={() => setActiveBusinessId(business.id)}
            >
              <Pin
                background={CATEGORY_PIN_COLORS[business.category].background}
                borderColor={CATEGORY_PIN_COLORS[business.category].borderColor}
                glyphColor={CATEGORY_PIN_COLORS[business.category].glyphColor}
              />
            </AdvancedMarker>
          ))}

          {activeBusiness && (
            <InfoWindow
              position={activeBusiness.location.coordinates}
              onCloseClick={() => setActiveBusinessId(null)}
              headerDisabled
              maxWidth={320}
            >
              <div className="relative max-w-xs">
                <button
                  onClick={() => setActiveBusinessId(null)}
                  className="absolute -top-2 -right-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                  aria-label="Close"
                >
                  <span className="block text-lg">&times;</span>
                </button>

                {activeBusinessPhoto && (
                  <div className="mb-2 w-full shrink-0 overflow-hidden rounded">
                    <Image
                      src={fetchFile(activeBusinessPhoto.key!)}
                      alt={activeBusinessPhoto.name}
                      width={0}
                      height={0}
                      sizes="100vw"
                      unoptimized
                      className="h-auto w-full rounded"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                )}

                <p className="mb-1 text-sm font-semibold">{activeBusiness.name}</p>
                <div className="mb-2">
                  <Badge className={cn("rounded-full", CATEGORY_PIN_COLORS[activeBusiness.category].badgeClassName)}>
                    {activeBusiness.category}
                  </Badge>
                </div>
                <p className="mb-2 line-clamp-3 text-xs text-muted-foreground wrap-break-word">
                  {activeBusiness.description}
                </p>

                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <strong className="font-medium text-foreground">Location:</strong>{" "}
                    {activeBusiness.location.address}
                  </p>
                  <p>
                    <strong className="font-medium text-foreground">Contact:</strong>{" "}
                    {activeBusiness.contactNumber}
                  </p>
                </div>

                <Button size="sm" className="w-full" onClick={() => setViewOpen(true)}>
                  View Details
                </Button>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>

      <CurrentLocationControl />

      {activeBusiness && (
        <ViewBusinessDialog business={activeBusiness} open={viewOpen} onOpenChange={setViewOpen} />
      )}
    </APIProvider>
  );
}
