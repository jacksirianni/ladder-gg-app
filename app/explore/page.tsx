import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Avatar } from "@/components/avatar";
import { LookingForTeamsBadge } from "@/components/looking-for-teams-badge";
import { ProfileLink } from "@/components/profile-link";
import { RegistrationStatus } from "@/components/registration-status";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { shouldShowLookingForTeams } from "@/lib/league-access";

/**
 * v2.0-E: public discovery page for OPEN_JOIN leagues that are
 * accepting registrations. UNLISTED and INVITE_ONLY leagues are
 * deliberately excluded — they require a direct link to find.
 *
 * Filter strategy is intentionally minimal in v1: a free-text game
 * search and a "Closing soon" sort. Sort default puts leagues with
 * imminent registration deadlines at the top so captains can see what
 * they need to act on quickly. Leagues without deadlines fall to the
 * bottom, ordered by newest first.
 *
 * No pagination yet — at LADDER's current scale a single page covers
 * everything. Add cursor pagination once we have >50 active OPEN_JOIN
 * leagues at once.
 */

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const metadata: Metadata = {
  title: "Explore leagues",
  description:
    "Find casual gaming leagues looking for teams — Overwatch, Valorant, dorm tournaments, and more.",
  openGraph: {
    title: "Explore leagues · LADDER.gg",
    description:
      "Find casual gaming leagues looking for teams on LADDER.gg.",
  },
  robots: { index: true, follow: true },
};

// Light revalidate — explore is read-heavy and tolerates a minute of
// staleness. Avoids hammering the DB on viral days.
export const revalidate = 60;

export default async function ExplorePage({ searchParams }: Props) {
  const { q: rawQuery } = await searchParams;
  const query = (rawQuery ?? "").trim();
  const queryLower = query.toLowerCase();

  // Pull a generous window — we'll filter further in TS to keep the
  // query simple. game-name search is case-insensitive `contains`.
  const leagues = await prisma.league.findMany({
    where: {
      state: "OPEN",
      visibility: "OPEN_JOIN",
      ...(query
        ? {
            game: {
              contains: query,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: [
      // closingDate asc nulls last — Prisma doesn't expose nulls last
      // directly so we sort in TS below; this just gets the rows.
      { createdAt: "desc" },
    ],
    take: 60,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      game: true,
      teamSize: true,
      maxTeams: true,
      buyInCents: true,
      format: true,
      registrationClosesAt: true,
      startsAt: true,
      lookingForTeams: true,
      createdAt: true,
      organizer: {
        select: {
          displayName: true,
          handle: true,
          avatarUrl: true,
        },
      },
      _count: { select: { teams: true } },
    },
  });

  // Filter out leagues that are already full — they may still be OPEN
  // server-side but there's no point listing them for discovery. The
  // captain would just bounce off the join page.
  const eligible = leagues.filter((l) => l._count.teams < l.maxTeams);

  // "Closing soon, then newest" sort. Leagues with a deadline that's
  // still in the future come first, soonest deadline at the top;
  // leagues without a deadline fall to the bottom, newest first.
  const now = Date.now();
  const sorted = [...eligible].sort((a, b) => {
    const aClose = a.registrationClosesAt?.getTime() ?? null;
    const bClose = b.registrationClosesAt?.getTime() ?? null;
    const aHasFuture = aClose !== null && aClose > now;
    const bHasFuture = bClose !== null && bClose > now;
    if (aHasFuture && bHasFuture) return aClose! - bClose!;
    if (aHasFuture) return -1;
    if (bHasFuture) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Explore
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Leagues looking for teams
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
              Open leagues from organizers who want more captains to sign
              up. Sorted by registration deadline — soonest first.
            </p>
          </div>
          <Link
            href="/leagues/new"
            className="rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Run your own →
          </Link>
        </div>

        {/* Search box. GET form — no JS required, the URL holds the
            state so it's shareable and crawlable. */}
        <form
          method="GET"
          className="mt-6 flex flex-wrap items-center gap-2"
          aria-label="Filter leagues by game"
        >
          <label htmlFor="q" className="sr-only">
            Game
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by game (e.g. Overwatch, Valorant)"
            className="min-w-[18rem] flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm placeholder:text-foreground-subtle focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <button
            type="submit"
            className="rounded-md border border-border bg-surface-elevated px-4 py-2 text-sm text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Filter
          </button>
          {query && (
            <Link
              href="/explore"
              className="font-mono text-xs text-foreground-subtle hover:text-foreground"
            >
              Clear
            </Link>
          )}
        </form>

        {sorted.length === 0 ? (
          <section className="mt-12 rounded-lg border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              {query ? "No matches" : "Nothing live right now"}
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">
              {query
                ? `No open leagues for "${query}".`
                : "No open leagues right now."}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
              {query
                ? "Try a broader search — or kick one off yourself."
                : "Be first — start a league for your friend group."}
            </p>
            <div className="mt-6">
              <Link
                href="/leagues/new"
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Create a league →
              </Link>
            </div>
          </section>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {sorted.map((l) => (
              <li key={l.id}>
                <ExploreCard league={l} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

type ExploreLeague = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  game: string;
  teamSize: number;
  maxTeams: number;
  buyInCents: number;
  format: "SINGLE_ELIM" | "DOUBLE_ELIM";
  registrationClosesAt: Date | null;
  startsAt: Date | null;
  lookingForTeams: boolean;
  organizer: {
    displayName: string;
    handle: string | null;
    avatarUrl: string | null;
  };
  _count: { teams: number };
};

function ExploreCard({ league }: { league: ExploreLeague }) {
  const teamCount = league._count.teams;
  const spotsRemaining = Math.max(0, league.maxTeams - teamCount);
  const showLft = shouldShowLookingForTeams({
    lookingForTeams: league.lookingForTeams,
    state: "OPEN",
    teamCount,
    maxTeams: league.maxTeams,
    registrationClosesAt: league.registrationClosesAt,
  });

  return (
    <Link
      href={`/leagues/${league.slug}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-zinc-600 hover:bg-surface-elevated">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-foreground-subtle">
            {league.game}
          </span>
          <span className="text-foreground-subtle">·</span>
          <span className="font-mono text-xs text-foreground-muted">
            {league.teamSize === 1 ? "1v1" : `${league.teamSize}v${league.teamSize}`}
          </span>
          <span className="text-foreground-subtle">·</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
            {league.format === "DOUBLE_ELIM" ? "Double-elim" : "Single-elim"}
          </span>
          {showLft && (
            <LookingForTeamsBadge spotsRemaining={spotsRemaining} />
          )}
        </div>

        <h3 className="text-lg font-semibold tracking-tight">
          {league.name}
        </h3>

        {league.description && (
          <p className="line-clamp-2 text-sm text-foreground-muted">
            {league.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar
              src={league.organizer.avatarUrl}
              name={league.organizer.displayName}
              size="sm"
            />
            <ProfileLink
              handle={league.organizer.handle}
              className="truncate font-mono text-[11px] text-foreground-subtle"
            >
              {league.organizer.displayName}
            </ProfileLink>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
            <span className="text-foreground-muted">
              <span className="text-foreground">{teamCount}</span>
              <span className="text-foreground-subtle">/{league.maxTeams}</span>{" "}
              teams
            </span>
            {league.buyInCents > 0 ? (
              <span className="text-foreground-muted">
                ${(league.buyInCents / 100).toFixed(0)} buy-in
              </span>
            ) : (
              <span className="text-foreground-subtle">Free entry</span>
            )}
          </div>
        </div>

        {(league.registrationClosesAt || league.startsAt) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-3 font-mono text-[11px]">
            <RegistrationStatus closesAt={league.registrationClosesAt} />
            {league.startsAt && (
              <span className="text-foreground-subtle">
                Starts{" "}
                {league.startsAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
