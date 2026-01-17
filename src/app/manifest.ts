import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ImageSearchReverse",
    short_name: "ImageSearch",
    description:
      "Reverse image search for publishers, creators, and brand teams. Upload a photo to uncover original sources, usage context, and visually similar matches.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6efe5",
    theme_color: "#f6efe5",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["productivity", "utilities", "photo"],
    screenshots: [
      {
        src: "/screenshot1.png",
        sizes: "540x720",
        type: "image/png",
        label: "Home screen showing search interface",
      },
    ],
  };
}
