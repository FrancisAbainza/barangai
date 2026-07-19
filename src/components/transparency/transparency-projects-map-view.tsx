"use client";

import { useState } from "react";
import Image from "next/image";
import { APIProvider, AdvancedMarker, InfoWindow, Map, Pin } from "@vis.gl/react-google-maps";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { fetchFile } from "@/lib/storage";
import MaduyaBoundaryOverlay from "@/components/maduya-boundary-overlay";
import CurrentLocationControl from "@/components/current-location-control";
import type { TransparencyProjectWithAuthor } from "@/actions/transparency";
import type { TransparencyProject } from "@/db/schema";
import type { LocationValue } from "@/components/map-picker";
import type { MediaItem } from "@/components/file-uploader";

// Roughly central Metro Manila; used only as a fallback when there are no projects to center on.
const DEFAULT_CENTER = { lat: 14.317511, lng: 121.059571 };

const CATEGORY_PIN_COLORS: Record<
  TransparencyProject["category"],
  { background: string; borderColor: string; glyphColor: string; badgeClassName: string }
> = {
  Infrastructure: {
    background: "#d97706",
    borderColor: "#b45309",
    glyphColor: "#78350f",
    badgeClassName: "bg-amber-600 text-white hover:bg-amber-600",
  },
  Health: {
    background: "#dc2626",
    borderColor: "#b91c1c",
    glyphColor: "#7f1d1d",
    badgeClassName: "bg-red-600 text-white hover:bg-red-600",
  },
  Education: {
    background: "#2563eb",
    borderColor: "#1d4ed8",
    glyphColor: "#1e3a8a",
    badgeClassName: "bg-blue-600 text-white hover:bg-blue-600",
  },
  Livelihood: {
    background: "#9333ea",
    borderColor: "#7e22ce",
    glyphColor: "#581c87",
    badgeClassName: "bg-purple-600 text-white hover:bg-purple-600",
  },
  "Social Welfare": {
    background: "#db2777",
    borderColor: "#be185d",
    glyphColor: "#831843",
    badgeClassName: "bg-pink-600 text-white hover:bg-pink-600",
  },
  "Peace and Order": {
    background: "#4f46e5",
    borderColor: "#4338ca",
    glyphColor: "#312e81",
    badgeClassName: "bg-indigo-600 text-white hover:bg-indigo-600",
  },
  Environment: {
    background: "#15803d",
    borderColor: "#166534",
    glyphColor: "#14532d",
    badgeClassName: "bg-green-700 text-white hover:bg-green-700",
  },
  Others: {
    background: "#4b5563",
    borderColor: "#374151",
    glyphColor: "#111827",
    badgeClassName: "bg-gray-600 text-white hover:bg-gray-600",
  },
};

function formatBudget(budget: string | null): string | null {
  if (!budget) return null;
  const amount = Number(budget);
  if (Number.isNaN(amount)) return null;
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

type ProjectWithLocation = TransparencyProjectWithAuthor & { location: LocationValue };

export default function TransparencyProjectsMapView({
  projects,
}: {
  projects: TransparencyProjectWithAuthor[];
}) {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const projectsWithLocation = projects.filter((project): project is ProjectWithLocation => !!project.location);
  const activeProject = projectsWithLocation.find((project) => project.id === activeProjectId) ?? null;
  const activeProjectImage = (activeProject?.media as MediaItem[] | undefined)?.find(
    (item) => item.type === "image" && item.key
  );

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {(Object.keys(CATEGORY_PIN_COLORS) as TransparencyProject["category"][]).map((category) => (
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
          defaultCenter={projectsWithLocation[0]?.location.coordinates ?? DEFAULT_CENTER}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          gestureHandling="greedy"
        >
          <MaduyaBoundaryOverlay />

          {projectsWithLocation.map((project) => (
            <AdvancedMarker
              key={project.id}
              position={project.location.coordinates}
              onClick={() => setActiveProjectId(project.id)}
            >
              <Pin
                background={CATEGORY_PIN_COLORS[project.category].background}
                borderColor={CATEGORY_PIN_COLORS[project.category].borderColor}
                glyphColor={CATEGORY_PIN_COLORS[project.category].glyphColor}
              />
            </AdvancedMarker>
          ))}

          {activeProject && (
            <InfoWindow
              position={activeProject.location.coordinates}
              onCloseClick={() => setActiveProjectId(null)}
              headerDisabled
              maxWidth={320}
            >
              <div className="relative max-w-xs">
                <button
                  onClick={() => setActiveProjectId(null)}
                  className="absolute -top-2 -right-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                  aria-label="Close"
                >
                  <span className="block text-lg">&times;</span>
                </button>

                {activeProjectImage && (
                  <div className="mb-2 w-full shrink-0 overflow-hidden rounded">
                    <Image
                      src={fetchFile(activeProjectImage.key!)}
                      alt={activeProjectImage.name}
                      width={0}
                      height={0}
                      sizes="100vw"
                      unoptimized
                      className="h-auto w-full rounded"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                )}

                <p className="mb-1 text-sm font-semibold">{activeProject.title}</p>
                <p className="mb-2 line-clamp-3 text-xs text-muted-foreground wrap-break-word">
                  {activeProject.description}
                </p>

                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Badge className={cn("rounded-full", CATEGORY_PIN_COLORS[activeProject.category].badgeClassName)}>
                    {activeProject.category}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    <strong className="font-medium text-foreground">Location:</strong>{" "}
                    {activeProject.location.address}
                  </p>
                  {formatBudget(activeProject.budget) && (
                    <p>
                      <strong className="font-medium text-foreground">Budget:</strong>{" "}
                      {formatBudget(activeProject.budget)}
                    </p>
                  )}
                  <p>
                    <strong className="font-medium text-foreground">Posted:</strong>{" "}
                    {formatDateTime(new Date(activeProject.createdAt))}
                  </p>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>

      <CurrentLocationControl />

      {projectsWithLocation.length === 0 && (
        <p className="pt-3 text-center text-sm text-muted-foreground">
          No projects with a location to display on the map.
        </p>
      )}
    </APIProvider>
  );
}
