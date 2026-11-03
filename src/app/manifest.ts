import type { MetadataRoute } from "next";
import { barangayName } from "@/lib/data";

// Lets the site be added to a phone's Home Screen as an app. iPhones need that before they can
// receive phone notifications (see PushNotificationToggle).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: barangayName,
    short_name: "Brgy. Maduya",
    description: "The official Barangay Maduya citizen and staff portal.",
    // The landing page sends signed-in users on to /portal.
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
