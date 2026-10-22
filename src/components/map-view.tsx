"use client";

import { Navigation } from "lucide-react";
import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MaduyaBoundaryOverlay from "@/components/maduya-boundary-overlay";
import RouteOverlay from "@/components/route-overlay";
import { useDirections } from "@/hooks/use-directions";
import type { LocationValue } from "@/components/map-picker";

interface MapViewProps {
  location: LocationValue;
  className?: string;
}

export default function MapView({ location, className }: MapViewProps) {
  const { directions, isRouting, showDirections, clearDirections } = useDirections();

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div>
        <div className={cn("h-72 w-full overflow-hidden rounded-lg border", className)}>
          <Map
            defaultZoom={16}
            defaultCenter={location.coordinates}
            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
            gestureHandling="cooperative"
          >
            <MaduyaBoundaryOverlay />

            <AdvancedMarker position={location.coordinates}>
              <Pin />
            </AdvancedMarker>

            {directions && (
              <RouteOverlay
                directions={directions}
                isRefreshing={isRouting}
                onRefresh={() => showDirections(directions.destination, directions.destinationName)}
                onClear={clearDirections}
              />
            )}
          </Map>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => showDirections(location.coordinates, location.address || "this location")}
          disabled={isRouting}
          className="mt-3"
        >
          <Navigation className="size-4" />
          {isRouting ? "Routing..." : "Directions"}
        </Button>
      </div>
    </APIProvider>
  );
}
