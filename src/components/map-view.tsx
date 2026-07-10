"use client";

import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import type { LocationValue } from "@/components/map-picker";

interface MapViewProps {
  location: LocationValue;
  className?: string;
}

export default function MapView({ location, className }: MapViewProps) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className={cn("h-72 w-full overflow-hidden rounded-lg border", className)}>
        <Map
          defaultZoom={16}
          defaultCenter={location.coordinates}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          gestureHandling="cooperative"
        >
          <AdvancedMarker position={location.coordinates}>
            <Pin />
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  );
}
