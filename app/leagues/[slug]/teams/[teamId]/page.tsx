import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { MatchStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { ProfileLink } from "@/components/profile-link";
import { SeasonPill } from "@/components/season-pill";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { canViewPayment } from "@/lib/permissions/league";
import { FORMAT_RULES, formatScorePair } from "@/lib/match-format";
import { cn } from "@/lib/cn";

type Props = {
  params: Promise<{ slug: string; teamId: string }>;
};

const statusVariant: Record<
  MatchStatus,
  "neutral" | "info" | "warning" | "success" | "destructive" | "primary"
> = {
  PENDING: "neutral",
  AWAITING_REPORT: "info",
  AWAITING_CONFIRM: "warning",
  CONFIRMED: "success",
  DISPUTED: "destructive",
  ORGANIZER_DECIDED: "primary",
};

const statusLabel: Record<MatchStatus, string> = {
  PENDING: "Waiting",
  AWAITING_REPORT: "Awaiting result",
  AWAITING_CONFIRM: "Needs confirmation",
  CONFIRMED: "Final",
  DISPUTED: "Disputed",
  ORGANIZER_DECIDED: "Resolved by organizer",
};

const paymentLabel = {
  PENDING: "Pending",
  PAID: "Paid",
  WAIVED: "Waived",
  REFUNDED: "Refunded",
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, teamId } = await params;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      name: true,
      league: { select: { slug: true, name: true, state: true } },
    },
  });
  if (!team || team.league.slug !== slug || team.league.state === "DRAFT") {
    return {};
  }
  return {
    title: `${team.name} — ${team.league.name}`,
    description: `${team.name}'s bracket path and match history in ${team.league.name} on LADDER.gg.`,
  };
}

export default async function TeamPage({ params }: Props) {
  const { slug, teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      captain: { select: { id: true, displayName: true, handle: true } },
      roster: { orderBy: { position: "asc" } },
      league: {
        select: {
          id: true,
          slug: true,
          name: true,
          game: true,
          state: true,
          buyInCents: true,
          maxTeams: true,
          matchFormat: true,
          organizerId: true,
          season: { select: { slug: true, name: true } },
          _count: { select: { teams: true } },
        },
      },
    },
  });

  if (!team || team.league.slug !== slug) notFound();
  if (team.league.state === "DRAFT") notFound();

  // Pull every match this team played in (as A or B) for this league.
  const matches = await prisma.match.findMany({
    where: {
      leagueId: team.league.id,
      OR: [{ teamAId: team.id }, { teamBId: team.id }],
    },
    orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
    include: {
      teamA: { select: { id: true, name: true } },
      teamB: { select: { id: true, name: true } },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          scoreText: true,
          reportedTeamAScore: true,
          reportedTeamBScore: true,
        },
      },
    },
  });

  // Decide who the viewer is — affects whether we show payment status.
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const showPayment = canViewPayment(viewerId, team, team.league);

  // Aggregate W/L from completed matches only.
  let wins = 0;
  let losses = 0;
  for (const m of matches) {
    if (m.status !== "CONFIRMED" && m.status !== "ORGANIZER_DECIDED") continue;
    if (m.winnerTeamId === team.id) wins += 1;
    else if (m.winnerTeamId !== null) losses += 1;
  }

  // Final placement — were they the league champion or runner-up?
  const finalMatch =
    matches.length > 0 ? matches[matches.length - 1] : null;
  const isChampion =
    team.league.state === "COMPLETED" &&
    finalMatch?.winnerTeamId === team.id &&
    finalMatch?.round ===
      Math.max(...matches.map((m) => m.round), 0);

  const formatRule = FORMAT_RULES[team.league.matchFormat];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <LeagueStateBadge state={team.league.state} />
          <span className="font-mono text-xs text-foreground-subtle">
            {team.league.game}
          </span>
          {team.league.season && (
            <SeasonPill
              slug={team.league.season.slug}
              name={team.league.season.name}
            />
          )}
        </div>
        <p
          className={cn(
            "mt-4 font-mono text-xs uppercase",
            isChampion
              ? "text-success"
              : "text-foreground-subtle",
          )}
          style={{ letterSpacing: "0.25em" }}
        >
          {isChampion ? "Champion" : "Team"}
        </p>
        <h1
          className={cn(
            "mt-2 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl",
            isChampion ? "text-success" : "text-foreground",
          )}
        >
          {team.name}
        </h1>
        <p className="mt-3 text-base text-foreground-muted">
          in{" "}
          <Link
            href={`/leagues/${team.league.slug}`}
            className="text-foreground hover:underline"
          >
            {team.league.name}
          </Link>
        </p>
        <p className="mt-2 text-sm text-foreground-subtle">
          Captained by{" "}
          <ProfileLink
            handle={team.captain.handle}
            className="text-foreground-muted"
          >
            {team.captain.displayName}
          </ProfileLink>
        </p>

        {/* Roster */}
        {team.roster.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {team.roster.map((entry) => (
              <li
                key={entry.position}
                className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-foreground-muted"
              >
                {entry.displayName}
              </li>
            ))}
          </ul>
        )}

        {/* Stats row */}
        <section className="mt-10 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <TeamStat label="Wins" value={wins} accent={wins > losses} />
          <TeamStat label="Losses" value={losses} />
          <TeamStat
            label="Matches played"
            value={wins + losses}
          />
          <TeamStat
            label="Format"
            value={formatRule.label}
            mono
          />
        </section>

        {showPayment && (
          <section className="mt-6 rounded-lg border border-border bg-surface px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Payment
            </p>
            <p className="mt-2 text-sm">
              <Badge variant="neutral">
                {paymentLabel[team.paymentStatus]}
              </Badge>
              {team.league.buyInCents > 0 && (
                <span className="ml-3 text-foreground-muted">
                  Entry $
                  {(team.league.buyInCents / 100).toFixed(2)}
                </span>
              )}
            </p>
            <p className="mt-2 text-xs text-foreground-subtle">
              Visible only to the team&apos;s captain and the organizer.
            </p>
          </section>
        )}

        {/* Bracket path */}
        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Bracket path ({matches.length})
          </h2>
          {matches.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-border bg-surface/40 px-4 py-3 text-sm text-foreground-muted">
              No matches assigned yet — the bracket hasn&apos;t reached
              this team.
            </p>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {matches.map((m) => {
                const isTeamA = m.teamAId === team.id;
                const opponent = isTeamA ? m.teamB : m.teamA;
                const myScore = isTeamA ? m.teamAScore : m.teamBScore;
                const oppScore = isTeamA ? m.teamBScore : m.teamAScore;
                const matchScorePair = formatScorePair(myScore, oppScore);
                const reportPair = m.reports[0]
                  ? formatScorePair(
                      isTeamA
                        ? m.reports[0].reportedTeamAScore
                        : m.reports[0].reportedTeamBScore,
                      isTeamA
                        ? m.reports[0].reportedTeamBScore
                        : m.reports[0].reportedTeamAScore,
                    )
                  : null;
                const scoreDisplay =
                  matchScorePair ?? reportPair ?? m.reports[0]?.scoreText ?? null;
                const isCompleted =
                  m.status === "CONFIRMED" ||
                  m.status === "ORGANIZER_DECIDED";
                const won = isCompleted && m.winnerTeamId === team.id;
                const lost =
                  isCompleted && m.winnerTeamId !== null && !won;

                return (
                  <li key={m.id}>
                    <Card
                      className={cn(
                        won && "border-success/40 bg-success/5",
                        lost && "border-border bg-surface/60 opacity-90",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-foreground-subtle">
                            {m.bracket === "GRAND_FINAL"
                              ? "Grand final"
                              : m.bracket === "GRAND_RESET"
                                ? "Grand reset"
                                : m.bracket === "LOSERS"
                                  ? `LB R${m.round} · M${m.bracketPosition}`
                                  : `R${m.round} · M${m.bracketPosition}`}
                          </span>
                          <Badge variant={statusVariant[m.status]}>
                            {statusLabel[m.status]}
                          </Badge>
                          {won && (
                            <span
                              className="font-mono text-[10px] uppercase tracking-wider text-success"
                              style={{ letterSpacing: "0.16em" }}
                            >
                              Won
                            </span>
                          )}
                          {lost && (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                              Lost
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/leagues/${team.league.slug}/matches/${m.id}`}
                          className="font-mono text-xs text-foreground-muted hover:text-foreground"
                        >
                          View match →
                        </Link>
                      </div>
                      <p className="mt-3 text-sm">
                        <span
                          className={cn(
                            "font-medium",
                            won && "text-success",
                          )}
                        >
                          {team.name}
                        </span>
                        <span className="px-2 text-foreground-subtle">vs</span>
                        <span
                          className={cn(
                            "font-medium",
                            lost && "text-success",
                          )}
                        >
                          {opponent ? opponent.name : "TBD"}
                        </span>
                        {scoreDisplay && (
                          <span className="ml-3 font-mono text-xs text-foreground-muted">
                            ({scoreDisplay})
                          </span>
                        )}
                      </p>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-12 border-t border-border pt-8">
          <Button asChild variant="secondary">
            <Link href={`/leagues/${team.league.slug}`}>Back to league</Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function TeamStat({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tracking-tight",
          mono && "text-base",
          accent && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}
