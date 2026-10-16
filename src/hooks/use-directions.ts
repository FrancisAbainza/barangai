"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { getCurrentLocation } from "@/lib/geolocation";
import { computeRoute, type RouteDirections } from "@/lib/directions";

/**
 * The route shown by <RouteOverlay>. `showDirections` always routes from the user's current
 * location, so calling it again with the same destination refreshes the route as they travel.
 *
 * Only the latest request is applied, so a slow request can't bring back a route that was
 * cleared or replaced while it was in flight.
 */
export function useDirections() {
  const [directions, setDirections] = useState<RouteDirections | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const latestRequest = useRef(0);

  /** Resolves to whether the route was shown. */
  async function showDirections(destination: google.maps.LatLngLiteral, destinationName: string) {
    const request = ++latestRequest.current;
    setIsRouting(true);
    try {
      const origin = await getCurrentLocation();
      const route = await computeRoute(origin, destination);
      if (request !== latestRequest.current) return false;
      setDirections({ origin, destination, destinationName, route });
      return true;
    } catch (error) {
      if (request === latestRequest.current) {
        toast.error(error instanceof Error ? error.message : "Unable to get directions.");
      }
      return false;
    } finally {
      if (request === latestRequest.current) setIsRouting(false);
    }
  }

  function clearDirections() {
    latestRequest.current++;
    setDirections(null);
    setIsRouting(false);
  }

  return { directions, isRouting, showDirections, clearDirections };
}
