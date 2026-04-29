import type { MetadataRoute } from "next";

/**
 * v2.0-C: PWA manifest. Lets browsers offer "Add to Home Screen" /
 * "Install" prompts, treats LADDER like a native app on supported
 * devices.
 *
 * No service worker is bundled in v2.0-C — pure PWA install only. A
 * minimal SW for offline support can land in v2.1+ if signal warrants
 * it. (Aggressive SW caching is a real risk for our revalidation model;
 * starting without one is the safer default.)
 *
 * Icons reuse the existing app/icon.tsx + app/apple-icon.tsx assets.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LADDER.gg",
    short_name: "LADDER",
    description:
      "Run gaming leagues with your crew — bracket generation, match reporting, recap.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090B",
    theme_color: "#A78BFA",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
