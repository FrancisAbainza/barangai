"use client";

import { useEffect } from "react";
import { Navigation, RefreshCw, X } from "lucide-react";
import { ControlPosition, MapControl, useMap } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { CurrentLocationMarker } from "@/components/current-location-control";
import { cn } from "@/lib/utils";
import type { RouteDirections } from "@/lib/directions";

/**
 * Draws a route from `useDirections` (`src/hooks/use-directions.ts`), frames the map around it and
 * shows the distance and travel time in a card. The card is a map control rather than page
 * content, so it stays visible in the map's fullscreen mode. Place it inside the <Map>.
 */
export default function RouteOverlay({
  directions,
  isRefreshing,
  onRefresh,
  onClear,
}: {
  directions: RouteDirections;
  isRefreshing: boolean;
  onRefresh: () => void;
  onClear: () => void;
}) {
  const map = useMap();
  const { origin, destinationName, route } = directions;
  const summary = [route.localizedValues?.distance, route.localizedValues?.duration].filter(Boolean).join(" · ");

  useEffect(() => {
    if (!map) return;

    const polylines = route.createPolylines({
      polylineOptions: (defaults) => ({ ...defaults, strokeColor: "#2563eb", strokeOpacity: 0.85, strokeWeight: 5 }),
    });
    polylines.forEach((polyline) => polyline.setMap(map));
    // Extra top padding keeps the route out from under the summary card.
    if (route.viewport) map.fitBounds(route.viewport, { top: 120, right: 48, bottom: 48, left: 48 });

    return () => polylines.forEach((polyline) => polyline.setMap(null));
  }, [map, route]);

  return (
    <>
      <CurrentLocationMarker position={origin} />

      {/* Below the Map/Satellite control. A top-center card collides with it and the fullscreen button on phones. */}
      <MapControl position={ControlPosition.INLINE_START_BLOCK_START}>
        <div className="light m-2.5 flex max-w-72 items-center gap-2.5 rounded-lg border bg-background py-1.5 pr-1.5 pl-3 text-foreground shadow-md sm:max-w-sm">
          <Navigation className="size-4 shrink-0 text-blue-600" />
          <div className="min-w-0 text-xs">
            <p className="truncate font-semibold">Route to {destinationName}</p>
            {summary && <p className="text-muted-foreground">{summary}</p>}
          </div>
          <div className="flex shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh route from my location"
            >
              <RefreshCw className={cn(isRefreshing && "animate-spin")} />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onClear} aria-label="Clear route">
              <X />
            </Button>
          </div>
        </div>
      </MapControl>
    </>
  );
}
