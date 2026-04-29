import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { computeRecapStats, formatRecapMessage } from "@/lib/recap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyMessageBox } from "@/components/copy-message-box";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { ProfileLink } from "@/components/profile-link";
import { SeasonPill } from "@/components/season-pill";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { duplicateLeagueAction } from "@/app/leagues/[slug]/manage/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const league = await prisma.league.findUnique({
    where: { slug },
    select: { name: true, state: true },
  });
  if (!league || league.state === "DRAFT") return {};
  return {
    title: `${league.name} — Recap`,
    description: `How ${league.name} played out on LADDER.gg.`,
  };
}

export default async function LeagueRecapPage({ params }: Props) {
  const { slug } = await params;

  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      season: { select: { slug: true, name: true } },
      teams: {
        orderBy: { createdAt: "asc" },
        include: {
          captain: { select: { displayName: true, handle: true } },
          roster: { orderBy: { position: "asc" } },
        },
      },
      matches: {
        orderBy: [{ round: "desc" }, { bracketPosition: "asc" }],
        select: {
          id: true,
          round: true,
          bracketPosition: true,
          status: true,
          teamAId: true,
          teamBId: true,
          winnerTeamId: true,
          disputedAt: true,
          reports: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { scoreText: true },
          },
        },
      },
    },
  });
  if (!league || league.state === "DRAFT") notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const isOrganizer = viewerId === league.organizerId;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const publicUrl = `${proto}://${host}/leagues/${league.slug}`;

  // -----------------------------------------------------------------
  // Non-completed states: polished placeholders.
  // -----------------------------------------------------------------
  if (league.state !== "COMPLETED") {
    const isCancelled = league.state === "CANCELLED";
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:px-12">
          <div className="flex flex-wrap items-center gap-3">
            <LeagueStateBadge state={league.state} />
            <span className="font-mono text-xs text-foreground-subtle">
              {league.game}
            </span>
            {league.season && (
              <SeasonPill
                slug={league.season.slug}
                name={league.season.name}
              />
            )}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {league.name}
          </h1>
          <Card className="mt-8">
            {isCancelled ? (
              <>
                <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                  Cancelled
                </p>
                <h2 className="mt-3 text-xl font-semibold">
                  This league was cancelled before completion.
                </h2>
                <p className="mt-2 text-sm text-foreground-muted">
                  No champion was crowned. Below is what happened up to the
                  point it was cancelled.
                </p>
              </>
            ) : (
              <>
                <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                  Recap pending
                </p>
                <h2 className="mt-3 text-xl font-semibold">
                  Recap will appear when this league finishes.
                </h2>
                <p className="mt-2 text-sm text-foreground-muted">
                  Once the final match is confirmed, you&apos;ll see the
                  champion, runner-up, and a shareable summary here.
                </p>
              </>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href={`/leagues/${league.slug}`}>View league</Link>
              </Button>
            </div>
          </Card>
        </main>
        <SiteFooter />
      </>
    );
  }

  // -----------------------------------------------------------------
  // Completed: full recap.
  // -----------------------------------------------------------------
  const finalMatch =
    league.matches.length > 0
      ? league.matches.reduce(
          (acc, m) => (m.round > acc.round ? m : acc),
          league.matches[0],
        )
      : null;
  const winnerTeam = finalMatch?.winnerTeamId
    ? league.teams.find((t) => t.id === finalMatch.winnerTeamId) ?? null
    : null;
  const runnerUpId = finalMatch?.winnerTeamId
    ? finalMatch.teamAId === finalMatch.winnerTeamId
      ? finalMatch.teamBId
      : finalMatch.teamAId
    : null;
  const runnerUpName = runnerUpId
    ? league.teams.find((t) => t.id === runnerUpId)?.name ?? null
    : null;
  const finalScoreText = finalMatch?.reports[0]?.scoreText ?? null;

  const stats = computeRecapStats({
    name: league.name,
    slug: league.slug,
    game: league.game,
    matches: league.matches.map((m) => ({
      status: m.status,
      disputedAt: m.disputedAt,
      round: m.round,
    })),
    teamsCount: league.teams.length,
  });

  const recapMessage = formatRecapMessage({
    leagueName: league.name,
    championName: winnerTeam?.name ?? null,
    runnerUpName,
    finalScoreText,
    teams: stats.teams,
    matchesPlayed: stats.matchesPlayed,
    disputesCount: stats.disputesCount,
    publicUrl,
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <LeagueStateBadge state={league.state} />
          <span className="font-mono text-xs text-foreground-subtle">
            {league.game}
          </span>
          {league.season && (
            <SeasonPill slug={league.season.slug} name={league.season.name} />
          )}
        </div>
        <p
          className="mt-6 font-mono text-xs uppercase text-success"
          style={{ letterSpacing: "0.25em" }}
        >
          Champion
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight text-success md:text-6xl">
          {winnerTeam?.name ?? "—"}
        </h1>
        {winnerTeam && (
          <p className="mt-3 text-base text-foreground-muted">
            Captained by{" "}
            <ProfileLink
              handle={winnerTeam.captain.handle}
              className="text-foreground"
            >
              {winnerTeam.captain.displayName}
            </ProfileLink>
          </p>
        )}
        <p className="mt-1 text-sm text-foreground-subtle">
          {league.name}
          {league.completedAt && (
            <>
              <span className="px-2">·</span>
              <span>
                {league.completedAt.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </>
          )}
        </p>

        {winnerTeam && winnerTeam.roster.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {winnerTeam.roster.map((entry) => (
              <li
                key={entry.position}
                className="rounded-md border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-xs text-success"
              >
                {entry.displayName}
              </li>
            ))}
          </ul>
        )}

        {/* Final match */}
        <Card className="mt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Final match
          </p>
          <p className="mt-3 text-lg font-semibold">
            <span className="text-success">{winnerTeam?.name ?? "—"}</span>
            {finalScoreText ? (
              <span className="px-2 font-mono text-base text-foreground-muted">
                {finalScoreText}
              </span>
            ) : (
              <span className="px-2 text-base font-normal text-foreground-muted">
                over
              </span>
            )}
            <span className="text-foreground-muted">
              {runnerUpName ?? "—"}
            </span>
          </p>
          {finalMatch && (
            <p className="mt-2 text-xs text-foreground-subtle">
              <Link
                href={`/leagues/${league.slug}/matches/${finalMatch.id}`}
                className="text-foreground-muted hover:text-foreground"
              >
                View final match →
              </Link>
            </p>
          )}
        </Card>

        {/* Stats */}
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <RecapStat label="Teams" value={stats.teams} />
          <RecapStat label="Matches played" value={stats.matchesPlayed} />
          <RecapStat label="Disputes resolved" value={stats.disputesCount} />
        </section>

        {/* Prize notes */}
        {league.prizeNotes && (
          <section className="mt-8 rounded-lg border border-border bg-surface p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Prize notes
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm">
              {league.prizeNotes}
            </p>
            <p className="mt-3 text-xs text-foreground-subtle">
              Organizer-managed. LADDER does not handle entry fees or prizes.
            </p>
          </section>
        )}

        {/* Copy recap message */}
        <section className="mt-8">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Share the recap
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Drop this in a group chat to celebrate the result.
          </p>
          <div className="mt-4">
            <CopyMessageBox
              message={recapMessage}
              copyLabel="Copy recap message"
            />
          </div>
        </section>

        {/* CTA row */}
        <section className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
          {isOrganizer && (
            <form action={duplicateLeagueAction}>
              <input type="hidden" name="leagueId" value={league.id} />
              <Button type="submit">Run it back →</Button>
            </form>
          )}
          {league.season && (
            <Button asChild variant="secondary">
              <Link href={`/seasons/${league.season.slug}`}>
                Back to {league.season.name}
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href={`/leagues/${league.slug}`}>View league</Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function RecapStat({ label, value }: { label: string; value: number }) {
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
