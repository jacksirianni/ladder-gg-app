import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LeagueState } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/card";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { ProfileLink } from "@/components/profile-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type Props = {
  params: Promise<{ slug: string }>;
};

const ACTIVE_STATES = new Set<LeagueState>(["DRAFT", "OPEN", "IN_PROGRESS"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const season = await prisma.season.findUnique({
    where: { slug },
    select: { name: true, description: true, _count: { select: { leagues: true } } },
  });
  if (!season) return {};
  const description =
    season.description ??
    `${season._count.leagues} league${season._count.leagues === 1 ? "" : "s"} on LADDER.gg.`;
  return {
    title: season.name,
    description,
    openGraph: {
      title: season.name,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: season.name,
      description,
    },
  };
}

export default async function SeasonPage({ params }: Props) {
  const { slug } = await params;

  const season = await prisma.season.findUnique({
    where: { slug },
    include: {
      organizer: { select: { displayName: true, handle: true } },
      leagues: {
        // v1.5 / Q1: hide cancelled leagues from the season home — keeps
        // the page celebratory and focused on history that mattered.
        // Active = DRAFT/OPEN/IN_PROGRESS (DRAFT is hidden from non-orgs
        // below; we still need it to compute stats).
        where: { state: { not: "CANCELLED" } },
        orderBy: [{ createdAt: "desc" }],
        include: {
          _count: { select: { teams: true, matches: true } },
          matches: {
            // Final match (highest round) gives us the champion. Take 1.
            orderBy: [{ round: "desc" }, { bracketPosition: "asc" }],
            take: 1,
            select: {
              winnerTeamId: true,
              winner: { select: { name: true } },
              disputedAt: true,
            },
          },
        },
      },
    },
  });

  if (!season) notFound();

  const allLeagues = season.leagues;

  // Filter out DRAFT for public viewers — DRAFTs are the organizer's
  // sketches. Public season home shouldn't expose them.
  const visibleLeagues = allLeagues.filter((l) => l.state !== "DRAFT");

  const activeLeagues = visibleLeagues.filter((l) =>
    ACTIVE_STATES.has(l.state),
  );
  const completedLeagues = visibleLeagues.filter(
    (l) => l.state === "COMPLETED",
  );

  // Aggregate stats. Counts are computed from visible (non-cancelled)
  // leagues so the numbers match what the page displays.
  const totalLeagues = visibleLeagues.length;
  const completedCount = completedLeagues.length;
  const totalTeams = visibleLeagues.reduce(
    (sum, l) => sum + l._count.teams,
    0,
  );
  const totalMatches = visibleLeagues.reduce(
    (sum, l) => sum + l._count.matches,
    0,
  );
  // Count matches that were disputed at any point (resolved or otherwise).
  // Per-league we'd need a separate query for an exact total; cheap proxy:
  // count leagues' final-match disputed flags. For an exact total we'd
  // hit the DB again. For now, fetch dispute counts inline.
  const leagueIds = visibleLeagues.map((l) => l.id);
  const disputeCount =
    leagueIds.length > 0
      ? await prisma.match.count({
          where: {
            leagueId: { in: leagueIds },
            disputedAt: { not: null },
          },
        })
      : 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Season
          </span>
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {season.name}
        </h1>
        {season.description && (
          <p className="mt-3 max-w-2xl text-foreground-muted">
            {season.description}
          </p>
        )}
        <p className="mt-3 text-sm text-foreground-subtle">
          Organized by{" "}
          <ProfileLink
            handle={season.organizer.handle}
            className="text-foreground-muted"
          >
            {season.organizer.displayName}
          </ProfileLink>
        </p>

        {/* Stats row */}
        <section className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          <SeasonStat label="Leagues" value={totalLeagues} />
          <SeasonStat label="Completed" value={completedCount} />
          <SeasonStat label="Teams" value={totalTeams} />
          <SeasonStat label="Matches" value={totalMatches} />
          <SeasonStat label="Disputes" value={disputeCount} />
        </section>

        {/* Champion hall */}
        <section className="mt-12">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Champion hall
          </h2>
          {completedLeagues.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-border bg-surface/40 px-4 py-6 text-sm text-foreground-muted">
              No champions crowned yet. The first completed league in this
              season will appear here.
            </p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {completedLeagues.map((league) => {
                const championName = league.matches[0]?.winner?.name ?? null;
                return (
                  <li key={league.id}>
                    <Link
                      href={`/leagues/${league.slug}`}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <article className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-success/30 bg-gradient-to-r from-success/10 via-success/5 to-transparent px-5 py-4 transition-colors hover:border-success/50">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-success">
                              Champion
                            </span>
                            <span className="font-mono text-xs text-foreground-subtle">
                              {league.game}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-lg font-semibold text-success">
                            {championName ?? "—"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-foreground-muted">
                            {league.name}
                            {league.completedAt && (
                              <>
                                <span className="px-2 text-foreground-subtle">
                                  ·
                                </span>
                                <span>
                                  {league.completedAt.toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-foreground-subtle">
                          View →
                        </span>
                      </article>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Active leagues */}
        {activeLeagues.length > 0 && (
          <section className="mt-12">
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Active right now ({activeLeagues.length})
            </h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {activeLeagues.map((league) => (
                <li key={league.id}>
                  <Link
                    href={`/leagues/${league.slug}`}
                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Card className="transition-colors hover:border-zinc-600">
                      <div className="flex items-start justify-between gap-3">
                        <LeagueStateBadge state={league.state} />
                        <span className="font-mono text-xs text-foreground-subtle">
                          {league.game}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold leading-tight tracking-tight">
                        {league.name}
                      </h3>
                      <p className="mt-2 font-mono text-xs text-foreground-subtle">
                        {league._count.teams} of {league.maxTeams} teams
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function SeasonStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}
