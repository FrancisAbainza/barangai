/**
 * Reverse-geocodes coordinates to a formatted address using the Maps JS SDK's
 * Geocoder. We intentionally use the client-side `google.maps.Geocoder` (loaded
 * via `APIProvider`) rather than the Geocoding web service REST endpoint, because
 * that endpoint does not send CORS headers and is blocked when called from the browser.
 */
export async function coordinatesToAddress(
  geocoder: google.maps.Geocoder,
  coordinates: google.maps.LatLngLiteral
): Promise<string> {
  try {
    const { results } = await geocoder.geocode({
      location: coordinates,
    });
    return results[0]?.formatted_address ?? "";
  } catch {
    return "";
  }
}
