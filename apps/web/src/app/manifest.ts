import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "negosyoOS",
    short_name: "negosyoOS",
    description: "A practical Business OS for Philippine SMEs.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#faf7ef",
    theme_color: "#043f8d",
    icons: [
      { src: "/brand/negosyoos-mark.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/negosyoos-mark.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Open POS", short_name: "POS", url: "/dashboard" }],
  };
}
