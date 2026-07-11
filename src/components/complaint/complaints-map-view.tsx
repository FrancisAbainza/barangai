"use client";

import { useState } from "react";
import Image from "next/image";
import { APIProvider, AdvancedMarker, InfoWindow, Map, Pin } from "@vis.gl/react-google-maps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ViewComplaintDialog from "@/components/complaint/dialogs/view-complaint-dialog";
import { statusBadgeVariant, priorityBadgeVariant, formatDate } from "@/lib/complaints";
import { fetchFile } from "@/lib/storage";
import type { ComplaintWithComplainant } from "@/actions/complaints";
import type { Complaint } from "@/db/schema";
import type { MediaItem } from "@/components/file-uploader";

// Roughly central Metro Manila; used only as a fallback when there are no complaints to center on.
const DEFAULT_CENTER = { lat: 14.317511, lng: 121.059571 };

const STATUS_PIN_COLORS: Record<
  Complaint["status"],
  { background: string; borderColor: string; glyphColor: string }
> = {
  Pending: { background: "#eab308", borderColor: "#a16207", glyphColor: "#713f12" },
  "In Progress": { background: "#3b82f6", borderColor: "#1d4ed8", glyphColor: "#1e3a8a" },
  Resolved: { background: "#22c55e", borderColor: "#15803d", glyphColor: "#14532d" },
  Dismissed: { background: "#ef4444", borderColor: "#b91c1c", glyphColor: "#7f1d1d" },
};

export default function ComplaintsMapView({ complaints }: { complaints: ComplaintWithComplainant[] }) {
  const [activeComplaintId, setActiveComplaintId] = useState<number | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const activeComplaint = complaints.find((complaint) => complaint.id === activeComplaintId) ?? null;
  const activeComplaintImage = (activeComplaint?.evidence as MediaItem[] | undefined)?.find(
    (item) => item.type === "image" && item.key
  );

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {(Object.keys(STATUS_PIN_COLORS) as Complaint["status"][]).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-full border"
              style={{
                backgroundColor: STATUS_PIN_COLORS[status].background,
                borderColor: STATUS_PIN_COLORS[status].borderColor,
              }}
            />
            <span>{status}</span>
          </div>
        ))}
      </div>

      <div className="h-128 w-full overflow-hidden rounded-lg border md:h-160">
        <Map
          defaultZoom={15}
          defaultCenter={complaints[0]?.location.coordinates ?? DEFAULT_CENTER}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          gestureHandling="greedy"
        >
          {complaints.map((complaint) => (
            <AdvancedMarker
              key={complaint.id}
              position={complaint.location.coordinates}
              onClick={() => setActiveComplaintId(complaint.id)}
            >
              <Pin {...STATUS_PIN_COLORS[complaint.status]} />
            </AdvancedMarker>
          ))}

          {activeComplaint && (
            <InfoWindow
              position={activeComplaint.location.coordinates}
              onCloseClick={() => setActiveComplaintId(null)}
              headerDisabled
              maxWidth={320}
            >
              <div className="relative max-w-xs">
                <button
                  onClick={() => setActiveComplaintId(null)}
                  className="absolute -top-2 -right-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                  aria-label="Close"
                >
                  <span className="block text-lg">&times;</span>
                </button>

                {activeComplaintImage && (
                  <div className="mb-2 w-full shrink-0 overflow-hidden rounded">
                    <Image
                      src={fetchFile(activeComplaintImage.key!)}
                      alt={activeComplaintImage.name}
                      width={0}
                      height={0}
                      sizes="100vw"
                      unoptimized
                      className="h-auto w-full rounded"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                )}

                <p className="mb-1 text-sm font-semibold">{activeComplaint.subject}</p>
                <p className="mb-2 line-clamp-3 text-xs text-muted-foreground wrap-break-word">
                  {activeComplaint.description}
                </p>

                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Badge variant={statusBadgeVariant(activeComplaint.status)}>{activeComplaint.status}</Badge>
                  <Badge variant={priorityBadgeVariant(activeComplaint.priority)}>
                    {activeComplaint.priority}
                  </Badge>
                </div>

                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <strong className="font-medium text-foreground">Location:</strong>{" "}
                    {activeComplaint.location.address}
                  </p>
                  <p>
                    <strong className="font-medium text-foreground">Complainant:</strong>{" "}
                    {activeComplaint.complainantName}
                  </p>
                  <p>
                    <strong className="font-medium text-foreground">Filed:</strong>{" "}
                    {formatDate(activeComplaint.createdAt)}
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

      {complaints.length === 0 && (
        <p className="pt-3 text-center text-sm text-muted-foreground">No complaints to display on the map.</p>
      )}

      {activeComplaint && (
        <ViewComplaintDialog complaint={activeComplaint} open={viewOpen} onOpenChange={setViewOpen} />
      )}
    </APIProvider>
  );
}
