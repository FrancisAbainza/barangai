"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  MapMouseEvent,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { coordinatesToAddress } from "@/lib/geocoding";
import { getCurrentLocation } from "@/lib/geolocation";

export interface LocationValue {
  coordinates: google.maps.LatLngLiteral;
  address: string;
}

interface MapPickerProps {
  value?: LocationValue;
  onChange: (value: LocationValue) => void;
}

// Default center used until the resident picks a location; roughly central Metro Manila.
const DEFAULT_CENTER = { lat: 14.317511, lng: 121.059571 };

function MapContent({
  location,
  onMarkerDragEnd,
}: {
  location?: LocationValue;
  onMarkerDragEnd: (ev: google.maps.MapMouseEvent) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !location?.coordinates) return;
    map.panTo(location.coordinates);
  }, [map, location?.coordinates]);

  if (!location) {
    return null;
  }

  return (
    <AdvancedMarker
      position={location.coordinates}
      draggable
      onDragEnd={onMarkerDragEnd}
    >
      <Pin />
    </AdvancedMarker>
  );
}

function MapPickerInner({ value, onChange }: MapPickerProps) {
  const geocodingLibrary = useMapsLibrary("geocoding");
  const geocoder = useMemo(
    () => (geocodingLibrary ? new geocodingLibrary.Geocoder() : null),
    [geocodingLibrary]
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const resolveLocation = useCallback(
    async (coordinates: google.maps.LatLngLiteral) => {
      setIsLoadingLocation(true);
      try {
        const address = geocoder ? await coordinatesToAddress(geocoder, coordinates) : "";
        onChange({ coordinates, address });
      } finally {
        setIsLoadingLocation(false);
      }
    },
    [geocoder, onChange]
  );

  const handleUseCurrentLocation = async () => {
    try {
      const coordinates = await getCurrentLocation();
      await resolveLocation(coordinates);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to get current location.");
    }
  };

  const handleMapClick = (ev: MapMouseEvent) => {
    if (!ev.detail.latLng) return;
    resolveLocation(ev.detail.latLng);
  };

  const handleMarkerDragEnd = (ev: google.maps.MapMouseEvent) => {
    if (!ev.latLng) return;
    resolveLocation({ lat: ev.latLng.lat(), lng: ev.latLng.lng() });
  };

  return (
    <div className="space-y-3">
      <div className="relative h-80 w-full overflow-hidden rounded-lg border">
        {isLoadingLocation && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
            Getting location...
          </div>
        )}
        <Map
          defaultZoom={15}
          defaultCenter={value?.coordinates ?? DEFAULT_CENTER}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
          onClick={handleMapClick}
          gestureHandling="greedy"
        >
          <MapContent location={value} onMarkerDragEnd={handleMarkerDragEnd} />
        </Map>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleUseCurrentLocation}
        disabled={isLoadingLocation}
        className="w-full"
      >
        <MapPin className="size-4" />
        {isLoadingLocation ? "Getting location..." : "Use Current Location"}
      </Button>

      {value && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p>{value.address || "Address unavailable"}</p>
        </div>
      )}
    </div>
  );
}

export default function MapPicker({ value, onChange }: MapPickerProps) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <MapPickerInner value={value} onChange={onChange} />
    </APIProvider>
  );
}
