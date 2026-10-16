export type RouteDirections = {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  destinationName: string;
  route: google.maps.routes.Route;
};

/**
 * Computes a driving route with the Maps JS SDK's Routes library (loaded via `APIProvider`).
 * This needs the Routes API enabled for the Maps key. The legacy `DirectionsService` is not an
 * option because the legacy Directions API can no longer be enabled on new projects.
 */
export async function computeRoute(
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral
): Promise<google.maps.routes.Route> {
  try {
    const { Route } = (await google.maps.importLibrary("routes")) as google.maps.RoutesLibrary;
    const { routes } = await Route.computeRoutes({
      origin,
      destination,
      travelMode: "DRIVING",
      fields: ["path", "viewport", "localizedValues"],
    });
    const route = routes?.[0];
    if (route) return route;
  } catch (error) {
    console.error("Failed to compute route:", error);
  }
  throw new Error("Unable to find a route to this location.");
}
