"use client";

import { Polygon, Polyline } from "@vis.gl/react-google-maps";
import { MADUYA_BOUNDARY_PATH } from "@/lib/maduya-boundary";

// Rectangle padded ~1 degree (~110km) around Maduya's bounds, used as the outer
// ring of the mask polygon so the barangay outline punches a hole in it. Kept
// well away from the antimeridian/poles (unlike a world-spanning rectangle),
// which the vector map renderer tessellates incorrectly for polygon holes.
const MASK_PADDING_DEGREES = 1;
const OUTER_MASK_BOUNDS: google.maps.LatLngLiteral[] = [
  { lat: 14.3291295 + MASK_PADDING_DEGREES, lng: 121.0505842 - MASK_PADDING_DEGREES },
  { lat: 14.3291295 + MASK_PADDING_DEGREES, lng: 121.0776824 + MASK_PADDING_DEGREES },
  { lat: 14.2973753 - MASK_PADDING_DEGREES, lng: 121.0776824 + MASK_PADDING_DEGREES },
  { lat: 14.2973753 - MASK_PADDING_DEGREES, lng: 121.0505842 - MASK_PADDING_DEGREES },
];

const CLOSED_BOUNDARY_PATH = [...MADUYA_BOUNDARY_PATH, MADUYA_BOUNDARY_PATH[0]];

/** Dims the map outside Barangay Maduya and traces its boundary. Render as a child of a vis.gl <Map>. */
export default function MaduyaBoundaryOverlay() {
  return (
    <>
      <Polygon
        paths={[OUTER_MASK_BOUNDS, MADUYA_BOUNDARY_PATH]}
        fillColor="#8F8F8F"
        fillOpacity={0.35}
        strokeOpacity={0}
        clickable={false}
      />
      <Polyline
        path={CLOSED_BOUNDARY_PATH}
        strokeOpacity={0}
        clickable={false}
        icons={[
          {
            icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: "#dc2626", scale: 3 },
            offset: "0",
            repeat: "16px",
          },
        ]}
      />
    </>
  );
}
