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
 *   - every league's recap page (only meaningful for COMPLETED, but harmless
 *     for IN_PROGRESS / OPEN — those render placeholders)
 *   - every season page
 *   - every player profile (one per user with a handle)
 *
 * Authenticated areas (/dashboard, /account, /leagues/[slug]/manage,
 * /leagues/new, /leagues/[slug]/join) are intentionally omitted — they
 * require auth and surface user data.
 *
 * Per-match pages are intentionally NOT enumerated: there can be many
 * matches per league and most are low-value to crawl. They're still
 * publicly accessible — captains share links directly.
 *
 * The DB queries are wrapped in try/catch so a sleeping Neon instance
 * during a Vercel build doesn't fail the deploy — we still ship the
 * static routes and pick up dynamic URLs on the next revalidation when
 * the DB is awake.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let leagues: { slug: string; updatedAt: Date }[] = [];
  let seasons: { slug: string; updatedAt: Date }[] = [];
  let users: { handle: string | null; updatedAt: Date }[] = [];
  try {
    [leagues, seasons, users] = await Promise.all([
      prisma.league.findMany({
        where: {
          state: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] },
          // v1.6: INVITE_ONLY leagues opt out of indexing entirely.
          // UNLISTED stays in the sitemap (organizer can still share
          // the link; we just don't crawl onward links from the page).
          visibility: { in: ["UNLISTED", "OPEN_JOIN"] },
        },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.season.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.user.findMany({
        where: { handle: { not: null } },
        // Prisma narrows out the null branch via the where clause but the
        // selected type still says `string | null`; we'll filter below.
        select: { handle: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
  } catch (err) {
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
      // v2.0-E: explore page — public discovery of OPEN_JOIN leagues.
      url: `${BASE_URL}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
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

  const leagueEntries: MetadataRoute.Sitemap = leagues.flatMap((l) => [
    {
      url: `${BASE_URL}/leagues/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/leagues/${l.slug}/recap`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    },
  ]);

  const seasonEntries: MetadataRoute.Sitemap = seasons.map((s) => ({
    url: `${BASE_URL}/seasons/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const profileEntries: MetadataRoute.Sitemap = users
    .filter((u): u is { handle: string; updatedAt: Date } => u.handle !== null)
    .map((u) => ({
      url: `${BASE_URL}/p/${u.handle}`,
      lastModified: u.updatedAt,
      changeFrequency: "weekly",
      priority: 0.3,
    }));

  return [
    ...staticEntries,
    ...leagueEntries,
    ...seasonEntries,
    ...profileEntries,
  ];
}
