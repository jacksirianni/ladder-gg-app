import type { MetadataRoute } from "next";

const BASE_URL = "https://ladder-gg-app.vercel.app";

/**
 * App-Router robots.txt. Allows public crawling but disallows authenticated
 * surfaces. The actual auth checks happen server-side; this is just a hint
 * to well-behaved crawlers so they don't waste cycles on redirects.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/dashboard",
          "/account",
          "/leagues/new",
          // Manage and join sub-routes — leagues/[slug] itself is public.
          "/leagues/*/manage",
          "/leagues/*/join",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
