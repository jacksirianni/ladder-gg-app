import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LeagueState, MatchStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DashHero } from "@/components/dashboard/dash-hero";
import { Pulse } from "@/components/dashboard/pulse";
import {
  ActionQueue,
  type ActionItem,
} from "@/components/dashboard/action-queue";
import { LeagueCard } from "@/components/dashboard/league-card";
import { SectionTitle } from "@/components/dashboard/section-title";
import { TrophyCase, type TrophyRow } from "@/components/dashboard/trophy-case";
import type {
  BracketData,
  BracketTeam,
} from "@/components/dashboard/mini-bracket";
import { Button } from "@/components/ui/button";

/**
 * v3.0: Dashboard refactored to the redesign in
 * `design_handoff_dashboard/` — DashHero + Pulse + ActionQueue +
 * LeagueCard grid + TrophyCase.
 *
 * Data shape notes:
 *   - We fetch the full team and match lists for every league we
 *     surface so we can render embedded MiniBrackets for IN_PROGRESS
 *     leagues. At LADDER scale (a user typically has <20 leagues
 *     active) the join is cheap.
 *   - Action queue entries derive a deadline from `match.updatedAt
 *     + 48h` since we don't have per-match scheduling. Once we ship
 *     match scheduling (v3.x), swap that to `match.scheduledAt`.
 *   - PAY items surface every team where `paymentStatus = PENDING`
 *     in OPEN or IN_PROGRESS leagues — they deep-link to the public
 *     league page where the captain can view payment instructions.
 *   - MiniBracket only renders for power-of-2 team counts (4/8/16);
 *     other counts gracefully fall back to the registration view to
 *     avoid the bye-rendering complexity (handled fully on the league
 *     page itself).
 */

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your active and past leagues on LADDER.gg.",
};

const ACTIVE_STATES = new Set<LeagueState>(["DRAFT", "OPEN", "IN_PROGRESS"]);
const ACTION_SLA_MS = 48 * 60 * 60 * 1000;
const POW2_RANGE = new Set([4, 8, 16]);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  // ---------------------------------------------------------------
  // Data fetching — leagues, teams, matches, actions
  // ---------------------------------------------------------------
  const [organized, captained] = await Promise.all([
    prisma.league.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { teams: true } },
        teams: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, captainUserId: true },
        },
        matches: {
          orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
          select: {
            bracket: true,
            round: true,
            bracketPosition: true,
            status: true,
            winnerTeamId: true,
            teamAId: true,
            teamBId: true,
          },
        },
      },
    }),
    prisma.team.findMany({
      where: { captainUserId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        league: {
          include: {
            _count: { select: { teams: true } },
            teams: {
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, captainUserId: true },
            },
            matches: {
              orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
              select: {
                bracket: true,
                round: true,
                bracketPosition: true,
                status: true,
                winnerTeamId: true,
                teamAId: true,
                teamBId: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Match-level action data with timestamps so we can derive deadlines.
  const [awaitingReportMatches, awaitingConfirmRaw] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: "AWAITING_REPORT",
        OR: [
          { teamA: { captainUserId: user.id } },
          { teamB: { captainUserId: user.id } },
        ],
      },
      orderBy: [{ updatedAt: "asc" }],
      select: {
        id: true,
        bracket: true,
        round: true,
        bracketPosition: true,
        status: true,
        winnerTeamId: true,
        teamAId: true,
        teamBId: true,
        updatedAt: true,
        league: { select: { slug: true, name: true } },
        teamA: { select: { id: true, name: true, captainUserId: true } },
        teamB: { select: { id: true, name: true, captainUserId: true } },
      },
    }),
    prisma.match.findMany({
      where: {
        status: "AWAITING_CONFIRM",
        OR: [
          { teamA: { captainUserId: user.id } },
          { teamB: { captainUserId: user.id } },
        ],
      },
      orderBy: [{ updatedAt: "asc" }],
      select: {
        id: true,
        bracket: true,
        round: true,
        bracketPosition: true,
        status: true,
        winnerTeamId: true,
        teamAId: true,
        teamBId: true,
        updatedAt: true,
        league: { select: { slug: true, name: true } },
        teamA: { select: { id: true, name: true, captainUserId: true } },
        teamB: { select: { id: true, name: true, captainUserId: true } },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { reportedByUserId: true, createdAt: true },
        },
      },
    }),
  ]);

  // Confirm pending = opponent reported, not me.
  const awaitingConfirmMatches = awaitingConfirmRaw.filter(
    (m) => m.reports[0] && m.reports[0].reportedByUserId !== user.id,
  );

  // ---------------------------------------------------------------
  // Action queue assembly
  // ---------------------------------------------------------------

  // Capture into a const so the closures below don't need to re-prove
  // the `if (!user) redirect()` narrowing — TS loses that across
  // function-declaration boundaries.
  const userId = user.id;

  // Build a REPORT or CONFIRM action item from a match row. We accept
  // the union of both shapes (the only difference is `reports[]` on
  // confirm rows) and read it via duck-typing rather than a cast.
  function matchToActionItem(
    m: {
      id: string;
      round: number;
      updatedAt: Date;
      league: { slug: string; name: string };
      teamA: { id: string; name: string; captainUserId: string } | null;
      teamB: { id: string; name: string; captainUserId: string } | null;
      reports?: { reportedByUserId: string; createdAt: Date }[];
    },
    kind: "REPORT" | "CONFIRM",
  ): ActionItem | null {
    if (!m.teamA || !m.teamB) return null;
    const youAreA = m.teamA.captainUserId === userId;
    const yourTeam = youAreA ? m.teamA : m.teamB;
    const opp = youAreA ? m.teamB : m.teamA;
    // Deadline: 48h SLA from updatedAt for REPORTs; 48h from the latest
    // report's createdAt for CONFIRMs (window opens when opponent reports).
    const deadlineSourceMs =
      kind === "CONFIRM" && m.reports && m.reports[0]
        ? m.reports[0].createdAt.getTime()
        : m.updatedAt.getTime();
    const deadline = new Date(deadlineSourceMs + ACTION_SLA_MS);
    return {
      kind,
      id: m.id,
      leagueSlug: m.league.slug,
      leagueName: m.league.name,
      round: m.round,
      yourTeamName: yourTeam.name,
      opponentName: opp.name,
      deadlineIso: deadline.toISOString(),
      href: `/leagues/${m.league.slug}?match=${encodeURIComponent(m.id)}`,
    };
  }

  const reportActions = awaitingReportMatches
    .map((m) => matchToActionItem(m, "REPORT"))
    .filter((x): x is ActionItem => x !== null);
  const confirmActions = awaitingConfirmMatches
    .map((m) => matchToActionItem(m, "CONFIRM"))
    .filter((x): x is ActionItem => x !== null);

  // PAY actions — captained teams with PENDING payment in non-completed
  // leagues. Deadline mirrors the registrationClosesAt; falls back to
  // 7 days from team creation if there's no closes-at.
  const payActions: ActionItem[] = captained
    .filter(
      (t) =>
        t.paymentStatus === "PENDING" && ACTIVE_STATES.has(t.league.state),
    )
    .map((t) => {
      const deadline =
        t.league.registrationClosesAt ??
        new Date(t.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      return {
        kind: "PAY" as const,
        id: `pay-${t.id}`,
        leagueSlug: t.league.slug,
        leagueName: t.league.name,
        yourTeamName: t.name,
        buyInCents: t.league.buyInCents,
        deadlineIso: deadline.toISOString(),
        href: `/leagues/${t.league.slug}`,
      };
    });

  // Compose: REPORTs (most urgent) → CONFIRMs → PAY
  const actionItems: ActionItem[] = [
    ...reportActions,
    ...confirmActions,
    ...payActions,
  ];

  // Per-league action counts so each LeagueCard can show "{n} pending".
  const pendingByLeagueSlug = new Map<string, number>();
  for (const a of actionItems) {
    pendingByLeagueSlug.set(
      a.leagueSlug,
      (pendingByLeagueSlug.get(a.leagueSlug) ?? 0) + 1,
    );
  }

  // ---------------------------------------------------------------
  // Active vs past partition + active-league counts
  // ---------------------------------------------------------------

  const organizedActive = organized.filter((l) => ACTIVE_STATES.has(l.state));
  const organizedPast = organized.filter((l) => !ACTIVE_STATES.has(l.state));
  const captainedActive = captained.filter((t) =>
    ACTIVE_STATES.has(t.league.state),
  );
  const captainedPast = captained.filter(
    (t) => !ACTIVE_STATES.has(t.league.state),
  );

  const activeLeagueIds = new Set<string>();
  for (const l of organizedActive) activeLeagueIds.add(l.id);
  for (const t of captainedActive) activeLeagueIds.add(t.league.id);

  const liveLeagueIds = new Set<string>();
  for (const l of organizedActive) {
    if (l.state === "IN_PROGRESS") liveLeagueIds.add(l.id);
  }
  for (const t of captainedActive) {
    if (t.league.state === "IN_PROGRESS") liveLeagueIds.add(t.league.id);
  }

  const hasAnything = organized.length > 0 || captained.length > 0;
  const totalLeagueCount = activeLeagueIds.size + organizedPast.length +
    new Set(captainedPast.map((t) => t.league.id)).size;

  // ---------------------------------------------------------------
  // Trophy rows from past leagues (deduped across roles)
  // ---------------------------------------------------------------

  const trophyMap = new Map<string, TrophyRow>();
  for (const l of organizedPast) {
    const championTeam = l.teams.find((t) =>
      l.matches.some(
        (m) =>
          m.winnerTeamId === t.id &&
          (m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED"),
      ),
    );
    trophyMap.set(l.id, {
      leagueId: l.id,
      leagueSlug: l.slug,
      leagueName: l.name,
      leagueState: l.state,
      game: l.game,
      championName: championTeam?.name ?? null,
      yourTeamName: null,
      youWon: false,
      role: "organizer",
      completedAt: l.completedAt,
    });
  }
  for (const t of captainedPast) {
    const championTeam = t.league.teams.find((tt) =>
      t.league.matches.some(
        (m) =>
          m.winnerTeamId === tt.id &&
          (m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED"),
      ),
    );
    const youWon = championTeam?.id === t.id;
    const existing = trophyMap.get(t.league.id);
    if (existing) {
      // Promoted from organizer-only — annotate captain role too.
      existing.yourTeamName = t.name;
      existing.youWon = youWon;
    } else {
      trophyMap.set(t.league.id, {
        leagueId: t.league.id,
        leagueSlug: t.league.slug,
        leagueName: t.league.name,
        leagueState: t.league.state,
        game: t.league.game,
        championName: championTeam?.name ?? null,
        yourTeamName: t.name,
        youWon,
        role: "captain",
        completedAt: t.league.completedAt,
      });
    }
  }
  const trophyRows = [...trophyMap.values()].sort((a, b) => {
    const aT = a.completedAt?.getTime() ?? 0;
    const bT = b.completedAt?.getTime() ?? 0;
    return bT - aT;
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-8 md:px-8 md:pb-24">
        {/* DashHero — welcome line + status row + CTA. */}
        <DashHero
          displayName={user.displayName}
          liveCount={liveLeagueIds.size}
          actionCount={actionItems.length}
          totalLeagues={totalLeagueCount}
        />

        {hasAnything ? (
          <>
            {/* Pulse — three stat cards with sparklines. */}
            <Pulse
              organizingCount={organized.length}
              playingCount={captained.length}
              liveCount={liveLeagueIds.size}
            />

            {/* On Deck — action queue. */}
            <ActionQueue items={actionItems} />

            {/* Organizing */}
            {organizedActive.length > 0 && (
              <section className="mt-12">
                <SectionTitle
                  title="Organizing"
                  count={organizedActive.length}
                />
                <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {organizedActive.map((league) => (
                    <li key={league.id}>
                      <LeagueCard
                        href={`/leagues/${league.slug}/manage`}
                        role="organizer"
                        state={league.state}
                        name={league.name}
                        game={league.game}
                        teamSize={league.teamSize}
                        teams={league._count.teams}
                        maxTeams={league.maxTeams}
                        buyInCents={league.buyInCents}
                        startsAt={league.startsAt}
                        pendingActions={
                          pendingByLeagueSlug.get(league.slug) ?? 0
                        }
                        bracket={buildBracketData(
                          league.teams,
                          league.matches,
                          league.format,
                          league.maxTeams,
                          userId,
                        )}
                        bracketRoundLabel={buildRoundLabel(
                          league.matches,
                          league.format,
                          league.maxTeams,
                        )}
                        isDoubleElim={league.format === "DOUBLE_ELIM"}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Playing in */}
            {captainedActive.length > 0 && (
              <section className="mt-12">
                <SectionTitle
                  title="Playing in"
                  count={captainedActive.length}
                />
                <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {captainedActive.map((t) => (
                    <li key={t.id}>
                      <LeagueCard
                        href={`/leagues/${t.league.slug}`}
                        role="captain"
                        state={t.league.state}
                        name={t.league.name}
                        game={t.league.game}
                        teamSize={t.league.teamSize}
                        teams={t.league._count.teams}
                        maxTeams={t.league.maxTeams}
                        buyInCents={t.league.buyInCents}
                        startsAt={t.league.startsAt}
                        teamName={t.name}
                        paymentStatus={t.paymentStatus}
                        pendingActions={
                          pendingByLeagueSlug.get(t.league.slug) ?? 0
                        }
                        bracket={buildBracketData(
                          t.league.teams,
                          t.league.matches,
                          t.league.format,
                          t.league.maxTeams,
                          userId,
                        )}
                        bracketRoundLabel={buildRoundLabel(
                          t.league.matches,
                          t.league.format,
                          t.league.maxTeams,
                        )}
                        isDoubleElim={t.league.format === "DOUBLE_ELIM"}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Trophy case */}
            <TrophyCase rows={trophyRows} />
          </>
        ) : (
          <section className="mt-12 rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Get started
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              No leagues yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
              Create your first league and share the invite link with your
              crew, or open an invite link from an organizer to register a
              team.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/leagues/new">Create a league</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/explore">Browse public</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

// ---------------------------------------------------------------
// Helpers — bracket data assembly
// ---------------------------------------------------------------

type DashLeagueMatch = {
  bracket: "WINNERS" | "LOSERS" | "GRAND_FINAL" | "GRAND_RESET";
  round: number;
  bracketPosition: number;
  status: MatchStatus;
  winnerTeamId: string | null;
  teamAId: string | null;
  teamBId: string | null;
};

type DashLeagueTeam = {
  id: string;
  name: string;
  captainUserId: string;
};

/**
 * Build BracketData for the LeagueCard's MiniBracket. Returns null if
 * the team count isn't a supported power of 2 (4/8/16) or if the
 * league hasn't actually started yet — caller falls back to the
 * registration progress region.
 *
 * Aliveness is computed by counting losses against each team:
 *   - SINGLE_ELIM: alive if 0 confirmed losses
 *   - DOUBLE_ELIM: alive if < 2 confirmed losses (SE rules in WB,
 *                  +1 in LB before elimination)
 */
function buildBracketData(
  teams: DashLeagueTeam[],
  matches: DashLeagueMatch[],
  format: "SINGLE_ELIM" | "DOUBLE_ELIM",
  maxTeams: number,
  viewerUserId: string,
): BracketData | null {
  if (!POW2_RANGE.has(maxTeams)) return null;
  if (teams.length === 0) return null;

  const decided = matches.filter(
    (m) =>
      m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED",
  );
  if (decided.length === 0 && teams.length < maxTeams) {
    // Not started yet — show registration view instead.
    return null;
  }

  const lossesByTeam = new Map<string, number>();
  for (const m of decided) {
    if (!m.winnerTeamId) continue;
    const loserId =
      m.teamAId === m.winnerTeamId ? m.teamBId : m.teamAId;
    if (!loserId) continue;
    lossesByTeam.set(loserId, (lossesByTeam.get(loserId) ?? 0) + 1);
  }
  const eliminatedThreshold = format === "DOUBLE_ELIM" ? 2 : 1;

  // Pad team list to maxTeams with synthetic "TBD" placeholders so the
  // bracket pyramids correctly. (Wouldn't happen in practice — startLeague
  // requires a power-of-2 team count for DE, and SE byes are rare.)
  const padded: BracketTeam[] = teams.slice(0, maxTeams).map((t) => ({
    id: t.id,
    name: t.name,
    isYou: t.captainUserId === viewerUserId,
    alive: (lossesByTeam.get(t.id) ?? 0) < eliminatedThreshold,
  }));
  while (padded.length < maxTeams) {
    padded.push({
      id: `bye-${padded.length}`,
      name: "Bye",
      isYou: false,
      alive: false,
    });
  }

  const totalRounds = Math.log2(maxTeams);
  // currentRound = highest WINNERS round that has at least one decided match.
  // (SE: the only bracket; DE: still the WB.)
  const wbDecided = decided.filter((m) => m.bracket === "WINNERS");
  const currentRound =
    wbDecided.length === 0
      ? 1
      : Math.min(
          totalRounds,
          Math.max(...wbDecided.map((m) => m.round)) + 1,
        );

  return {
    totalRounds,
    currentRound,
    teams: padded,
  };
}

function buildRoundLabel(
  matches: DashLeagueMatch[],
  format: "SINGLE_ELIM" | "DOUBLE_ELIM",
  maxTeams: number,
): string | null {
  if (!POW2_RANGE.has(maxTeams)) return null;
  const totalRounds = Math.log2(maxTeams);
  const decided = matches.filter(
    (m) =>
      (m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED") &&
      m.bracket === "WINNERS",
  );
  const currentRound =
    decided.length === 0
      ? 1
      : Math.min(totalRounds, Math.max(...decided.map((m) => m.round)) + 1);
  const formatTag = format === "DOUBLE_ELIM" ? "WB" : "Bracket";
  return `${formatTag} · Round ${currentRound} of ${totalRounds}`;
}
