import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatMatchShareMessage } from "@/lib/recap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyMessageBox } from "@/components/copy-message-box";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { ProfileLink } from "@/components/profile-link";
import { SeasonPill } from "@/components/season-pill";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type Props = {
  params: Promise<{ slug: string; matchId: string }>;
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, matchId } = await params;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      round: true,
      bracketPosition: true,
      league: {
        select: { slug: true, name: true, state: true, visibility: true },
      },
      teamA: { select: { name: true } },
      teamB: { select: { name: true } },
    },
  });
  if (!match || match.league.slug !== slug || match.league.state === "DRAFT") {
    return {};
  }
  const a = match.teamA?.name ?? "TBD";
  const b = match.teamB?.name ?? "TBD";
  const title = `${a} vs ${b} — ${match.league.name}`;
  // v1.6: respect parent league's visibility for crawlers.
  const robots =
    match.league.visibility === "INVITE_ONLY"
      ? { index: false, follow: false }
      : match.league.visibility === "UNLISTED"
        ? { index: true, follow: false }
        : { index: true, follow: true };
  return {
    title,
    description: `Round ${match.round}, Match ${match.bracketPosition} on LADDER.gg.`,
    robots,
  };
}

export default async function MatchSharePage({ params }: Props) {
  const { slug, matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      league: {
        select: {
          id: true,
          slug: true,
          name: true,
          game: true,
          state: true,
          season: { select: { slug: true, name: true } },
        },
      },
      teamA: {
        select: {
          id: true,
          name: true,
          captain: { select: { displayName: true, handle: true } },
        },
      },
      teamB: {
        select: {
          id: true,
          name: true,
          captain: { select: { displayName: true, handle: true } },
        },
      },
      resolvedBy: { select: { displayName: true, handle: true } },
      disputedBy: { select: { displayName: true, handle: true } },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          scoreText: true,
          createdAt: true,
          reportedBy: { select: { displayName: true, handle: true } },
        },
      },
    },
  });

  // 404 if missing, slug mismatch, or parent league is DRAFT.
  if (!match || match.league.slug !== slug || match.league.state === "DRAFT") {
    notFound();
  }

  const teamAName = match.teamA?.name ?? "TBD";
  const teamBName = match.teamB?.name ?? "TBD";
  const winnerId = match.winnerTeamId;
  const winnerName =
    winnerId === match.teamA?.id
      ? teamAName
      : winnerId === match.teamB?.id
        ? teamBName
        : null;

  const latestReport = match.reports[0] ?? null;
  const scoreText = latestReport?.scoreText ?? null;

  const showResolvedAnnotation = match.status === "ORGANIZER_DECIDED";

  // Build public URL for the share message.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const publicUrl = `${proto}://${host}/leagues/${match.league.slug}/matches/${match.id}`;

  const shareMessage = formatMatchShareMessage({
    leagueName: match.league.name,
    round: match.round,
    bracketPosition: match.bracketPosition,
    teamAName,
    teamBName,
    winnerName,
    scoreText,
    publicUrl,
  });

  const isCompleted =
    match.status === "CONFIRMED" || match.status === "ORGANIZER_DECIDED";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <LeagueStateBadge state={match.league.state} />
          <span className="font-mono text-xs text-foreground-subtle">
            {match.league.game}
          </span>
          {match.league.season && (
            <SeasonPill
              slug={match.league.season.slug}
              name={match.league.season.name}
            />
          )}
        </div>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
          Round {match.round} · Match {match.bracketPosition}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          {teamAName} <span className="text-foreground-subtle">vs</span>{" "}
          {teamBName}
        </h1>
        <p className="mt-2 text-sm text-foreground-subtle">
          in{" "}
          <Link
            href={`/leagues/${match.league.slug}`}
            className="text-foreground-muted hover:text-foreground"
          >
            {match.league.name}
          </Link>
        </p>

        {/* Result card */}
        <Card className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant={statusVariant[match.status]}>
              {statusLabel[match.status]}
            </Badge>
            {showResolvedAnnotation && (
              <span className="font-mono text-xs text-foreground-subtle">
                Decided by organizer
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <SideBlock
              name={teamAName}
              captain={match.teamA?.captain}
              isWinner={winnerId !== null && winnerId === match.teamA?.id}
              isLoser={
                isCompleted &&
                winnerId !== null &&
                winnerId !== match.teamA?.id
              }
            />
            <SideBlock
              name={teamBName}
              captain={match.teamB?.captain}
              isWinner={winnerId !== null && winnerId === match.teamB?.id}
              isLoser={
                isCompleted &&
                winnerId !== null &&
                winnerId !== match.teamB?.id
              }
            />
          </div>

          {scoreText && (
            <p className="mt-6 font-mono text-2xl font-semibold">
              {scoreText}
            </p>
          )}

          {match.status === "PENDING" && (
            <p className="mt-6 text-sm text-foreground-muted">
              This match isn&apos;t ready yet — it&apos;s waiting for an
              upstream match to finish.
            </p>
          )}
          {match.status === "AWAITING_REPORT" && (
            <p className="mt-6 text-sm text-foreground-muted">
              Awaiting a result report from one of the captains.
            </p>
          )}
          {match.status === "AWAITING_CONFIRM" && (
            <p className="mt-6 text-sm text-foreground-muted">
              A result has been reported and is awaiting confirmation from
              the opposing captain.
            </p>
          )}
          {match.status === "DISPUTED" && (
            <p className="mt-6 text-sm text-foreground-muted">
              The captains disagreed on the result. The organizer will
              declare a winner.
            </p>
          )}
        </Card>

        {/* Activity */}
        {(latestReport ||
          (match.confirmedAt && match.resolvedBy) ||
          (match.disputedAt && match.disputedBy)) && (
          <section className="mt-8">
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Activity
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-foreground-muted">
              {latestReport && (
                <li>
                  Reported by{" "}
                  <ProfileLink
                    handle={latestReport.reportedBy.handle}
                    className="text-foreground"
                  >
                    {latestReport.reportedBy.displayName}
                  </ProfileLink>
                </li>
              )}
              {match.disputedAt && match.disputedBy && (
                <li>
                  Disputed by{" "}
                  <ProfileLink
                    handle={match.disputedBy.handle}
                    className="text-foreground"
                  >
                    {match.disputedBy.displayName}
                  </ProfileLink>
                </li>
              )}
              {match.confirmedAt && match.resolvedBy && (
                <li>
                  {match.status === "ORGANIZER_DECIDED"
                    ? "Resolved by organizer "
                    : "Confirmed by "}
                  <ProfileLink
                    handle={match.resolvedBy.handle}
                    className="text-foreground"
                  >
                    {match.resolvedBy.displayName}
                  </ProfileLink>
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Copy share message — only meaningful once the match is decided */}
        {isCompleted && (
          <section className="mt-10">
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Share this match
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Drop the result in a group chat.
            </p>
            <div className="mt-4">
              <CopyMessageBox
                message={shareMessage}
                copyLabel="Copy result message"
              />
            </div>
          </section>
        )}

        <section className="mt-10 border-t border-border pt-8">
          <Button asChild variant="secondary">
            <Link href={`/leagues/${match.league.slug}`}>Back to league</Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SideBlock({
  name,
  captain,
  isWinner,
  isLoser,
}: {
  name: string;
  captain: { displayName: string; handle: string | null } | undefined | null;
  isWinner: boolean;
  isLoser: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-4 " +
        (isWinner
          ? "border-success/40 bg-success/5"
          : isLoser
            ? "border-border bg-surface/50 opacity-80"
            : "border-border bg-surface")
      }
    >
      <p
        className={
          "truncate text-lg font-semibold " +
          (isWinner ? "text-success" : "text-foreground")
        }
      >
        {name}
      </p>
      {captain && (
        <p className="mt-1 text-xs text-foreground-muted">
          Captain:{" "}
          <ProfileLink handle={captain.handle} className="text-foreground">
            {captain.displayName}
          </ProfileLink>
        </p>
      )}
      {isWinner && (
        <p
          className="mt-2 font-mono text-[11px] uppercase tracking-wider text-success"
          style={{ letterSpacing: "0.2em" }}
        >
          Winner
        </p>
      )}
    </div>
  );
}
