import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";

const BASE_URL = "https://ladder-gg-app.vercel.app";

// Regenerate at most once an hour. Keeps crawler load light and avoids
// hammering Neon for what is effectively static-ish data.
export const revalidate = 3600;

/**
 * App-Router sitemap. Lists publicly crawlable routes:
 *   - landing page
 *   - auth pages (signin / signup)
 *   - legal pages (privacy / terms)
 *   - every league public page that's not in DRAFT or CANCELLED state
 *
 * Authenticated areas (/dashboard, /account, /leagues/[slug]/manage,
 * /leagues/new, /leagues/[slug]/join) are intentionally omitted — they
 * require auth and surface user data.
 *
 * The DB query is wrapped in try/catch so a sleeping Neon instance during
 * a Vercel build doesn't fail the deploy — we still ship the static routes
 * and pick up league URLs on the next revalidation when the DB is awake.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let leagues: { slug: string; updatedAt: Date }[] = [];
  try {
    leagues = await prisma.league.findMany({
      where: {
        state: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (err) {
    // Don't break the sitemap if the DB is briefly unavailable; the
    // static routes alone are still useful, and the revalidate window
    // will retry within the hour.
    console.error("[sitemap] DB query failed, returning static routes only:", err);
  }

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/signin`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const leagueEntries: MetadataRoute.Sitemap = leagues.map((l) => ({
    url: `${BASE_URL}/leagues/${l.slug}`,
    lastModified: l.updatedAt,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticEntries, ...leagueEntries];
}
