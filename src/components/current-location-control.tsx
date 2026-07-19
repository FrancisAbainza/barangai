"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LocateFixed } from "lucide-react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { getCurrentLocation } from "@/lib/geolocation";

/**
 * Button that pans to and pins the user's current position. Renders the button
 * itself plus the marker; place it anywhere inside the same <APIProvider> as
 * the <Map> (it does not need to be nested inside <Map>).
 */
export default function CurrentLocationControl() {
  const map = useMap();
  const [coordinates, setCoordinates] = useState<google.maps.LatLngLiteral | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleClick = async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentLocation();
      setCoordinates(location);
      map?.panTo(location);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to retrieve your location.");
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isLocating} className="mt-3">
        <LocateFixed className="size-4" />
        {isLocating ? "Locating..." : "Show My Location"}
      </Button>

      {coordinates && (
        <AdvancedMarker position={coordinates}>
          <div className="relative flex size-4 items-center justify-center">
            <span className="absolute size-4 animate-ping rounded-full bg-blue-500/60" />
            <span className="relative size-3 rounded-full border-2 border-white bg-blue-500 shadow" />
          </div>
        </AdvancedMarker>
      )}
    </>
  );
}
