import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LeagueState, PaymentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { ActionQueue, type ActionQueueItem } from "@/components/action-queue";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const paymentLabel: Record<PaymentStatus, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  WAIVED: "Waived",
  REFUNDED: "Refunded",
};

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your active and past leagues on LADDER.gg.",
};

const ACTIVE_STATES = new Set<LeagueState>(["DRAFT", "OPEN", "IN_PROGRESS"]);

function isActive(state: LeagueState) {
  return ACTIVE_STATES.has(state);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const [organized, captained] = await Promise.all([
    prisma.league.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { teams: true } },
        matches: {
          orderBy: [{ round: "desc" }, { bracketPosition: "asc" }],
          take: 1,
          select: {
            winnerTeamId: true,
            winner: { select: { name: true } },
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
            matches: {
              orderBy: [{ round: "desc" }, { bracketPosition: "asc" }],
              take: 1,
              select: {
                winnerTeamId: true,
                winner: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  // v1.4: surface the actual matches needing action (not just counts), so the
  // dashboard can deep-link straight to the right modal.
  const [awaitingReport, awaitingConfirmRaw] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: "AWAITING_REPORT",
        OR: [
          { teamA: { captainUserId: user.id } },
          { teamB: { captainUserId: user.id } },
        ],
      },
      orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
      select: {
        id: true,
        leagueId: true,
        round: true,
        bracketPosition: true,
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
      orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
      select: {
        id: true,
        leagueId: true,
        round: true,
        bracketPosition: true,
        league: { select: { slug: true, name: true } },
        teamA: { select: { id: true, name: true, captainUserId: true } },
        teamB: { select: { id: true, name: true, captainUserId: true } },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { reportedByUserId: true },
        },
      },
    }),
  ]);
  // Confirm-pending only counts when the *opponent* reported.
  const awaitingConfirm = awaitingConfirmRaw.filter(
    (m) => m.reports[0] && m.reports[0].reportedByUserId !== user.id,
  );

  // Per-league counts (kept for the secondary indicator on captained league
  // cards below).
  const actionsByLeague = new Map<string, number>();
  for (const m of awaitingReport) {
    actionsByLeague.set(m.leagueId, (actionsByLeague.get(m.leagueId) ?? 0) + 1);
  }
  for (const m of awaitingConfirm) {
    actionsByLeague.set(m.leagueId, (actionsByLeague.get(m.leagueId) ?? 0) + 1);
  }

  // v1.4: build a flat action queue prioritising "you need to report" first
  // (those gate everything else) then "you need to confirm".
  const userId = user.id;
  function rowFromMatch(
    m: (typeof awaitingReport)[number],
    action: "report" | "confirm",
  ): ActionQueueItem | null {
    if (!m.teamA || !m.teamB) return null;
    const youAreA = m.teamA.captainUserId === userId;
    const yourTeam = youAreA ? m.teamA : m.teamB;
    const opp = youAreA ? m.teamB : m.teamA;
    return {
      matchId: m.id,
      leagueSlug: m.league.slug,
      leagueName: m.league.name,
      action,
      round: m.round,
      bracketPosition: m.bracketPosition,
      yourTeamName: yourTeam.name,
      opponentName: opp.name,
    };
  }
  const actionQueueItems: ActionQueueItem[] = [
    ...awaitingReport
      .map((m) => rowFromMatch(m, "report"))
      .filter((x): x is ActionQueueItem => x !== null),
    ...awaitingConfirm
      .map((m) => rowFromMatch(m, "confirm"))
      .filter((x): x is ActionQueueItem => x !== null),
  ];

  const hasAnything = organized.length > 0 || captained.length > 0;

  // v1.3: split active vs past for both organizing and playing.
  const organizedActive = organized.filter((l) => isActive(l.state));
  const organizedPast = organized.filter((l) => !isActive(l.state));
  const captainedActive = captained.filter((t) => isActive(t.league.state));
  const captainedPast = captained.filter((t) => !isActive(t.league.state));

  const activeIds = new Set<string>();
  for (const l of organizedActive) activeIds.add(l.id);
  for (const t of captainedActive) activeIds.add(t.league.id);
  const activeCount = activeIds.size;

  // v1.3: champion row = past leagues with a recorded winner, deduped by leagueId.
  type ChampionRowEntry = {
    leagueId: string;
    leagueSlug: string;
    leagueName: string;
    leagueState: LeagueState;
    game: string;
    championName: string | null;
    yourTeamName: string | null;
    youWon: boolean;
    role: "organizer" | "captain";
  };
  const championRowsMap = new Map<string, ChampionRowEntry>();
  for (const l of organizedPast) {
    const championName = l.matches[0]?.winner?.name ?? null;
    championRowsMap.set(l.id, {
      leagueId: l.id,
      leagueSlug: l.slug,
      leagueName: l.name,
      leagueState: l.state,
      game: l.game,
      championName,
      yourTeamName: null,
      youWon: false,
      role: "organizer",
    });
  }
  for (const t of captainedPast) {
    const championName = t.league.matches[0]?.winner?.name ?? null;
    const winnerTeamId = t.league.matches[0]?.winnerTeamId ?? null;
    const youWon = winnerTeamId !== null && winnerTeamId === t.id;
    const existing = championRowsMap.get(t.league.id);
    if (existing) {
      // Already in the map as organizer — annotate that they also captained.
      existing.yourTeamName = t.name;
      existing.youWon = youWon;
    } else {
      championRowsMap.set(t.league.id, {
        leagueId: t.league.id,
        leagueSlug: t.league.slug,
        leagueName: t.league.name,
        leagueState: t.league.state,
        game: t.league.game,
        championName,
        yourTeamName: t.name,
        youWon,
        role: "captain",
      });
    }
  }
  const championRows = Array.from(championRowsMap.values());

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:px-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Hi, {user.displayName}
            </h1>
            <p className="mt-2 max-w-md text-sm text-foreground-muted">
              Leagues you are organizing or playing in.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/leagues/new">Create a league</Link>
          </Button>
        </header>

        {hasAnything && (
          <section className="mt-8 grid grid-cols-3 gap-3">
            <StatCard label="Organizing" value={organized.length} />
            <StatCard label="Playing" value={captained.length} />
            <StatCard label="Active" value={activeCount} accent />
          </section>
        )}

        {/* v1.4: top-of-dashboard action queue with deep links into matches. */}
        <ActionQueue items={actionQueueItems} />

        {!hasAnything ? (
          <section className="mt-12 rounded-lg border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
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
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href="/leagues/new">Create a league</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            {organizedActive.length > 0 && (
              <section className="mt-12">
                <SectionHeader
                  title="Organizing"
                  count={organizedActive.length}
                />
                <ul className="mt-5 grid gap-3 md:grid-cols-2">
                  {organizedActive.map((league) => (
                    <li key={league.id}>
                      <Link
                        href={`/leagues/${league.slug}/manage`}
                        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <article className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-zinc-600 hover:bg-surface-elevated">
                          <div className="flex items-start justify-between gap-3">
                            <LeagueStateBadge state={league.state} />
                            <span className="font-mono text-xs text-foreground-subtle">
                              {league.game}
                            </span>
                          </div>
                          <h3 className="mt-5 text-xl font-semibold leading-tight tracking-tight">
                            {league.name}
                          </h3>
                          <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
                            <Stat
                              label="Entry"
                              value={`$${(league.buyInCents / 100).toFixed(2)}`}
                            />
                            <Stat
                              label="Teams"
                              value={`${league._count.teams} / ${league.maxTeams}`}
                            />
                          </dl>
                        </article>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {captainedActive.length > 0 && (
              <section className="mt-10">
                <SectionHeader
                  title="Playing in"
                  count={captainedActive.length}
                />
                <ul className="mt-5 grid gap-3 md:grid-cols-2">
                  {captainedActive.map((team) => {
                    const actionCount =
                      actionsByLeague.get(team.league.id) ?? 0;
                    return (
                      <li key={team.id}>
                        <Link
                          href={`/leagues/${team.league.slug}`}
                          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <article className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-zinc-600 hover:bg-surface-elevated">
                            <div className="flex items-start justify-between gap-3">
                              <LeagueStateBadge state={team.league.state} />
                              {actionCount > 0 ? (
                                <span className="font-mono text-xs uppercase tracking-wider text-warning">
                                  {actionCount} action
                                  {actionCount === 1 ? "" : "s"} needed
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-foreground-subtle">
                                  {paymentLabel[team.paymentStatus]}
                                </span>
                              )}
                            </div>
                            <h3 className="mt-5 text-xl font-semibold leading-tight tracking-tight">
                              {team.league.name}
                            </h3>
                            <p className="mt-1 text-xs text-foreground-muted">
                              Captain of{" "}
                              <span className="text-foreground">{team.name}</span>
                            </p>
                            <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
                              <Stat
                                label="Entry"
                                value={`$${(team.league.buyInCents / 100).toFixed(2)}`}
                              />
                              <Stat
                                label="Status"
                                value={paymentLabel[team.paymentStatus]}
                              />
                              <Stat
                                label="Teams"
                                value={`${team.league._count.teams} / ${team.league.maxTeams}`}
                              />
                            </dl>
                          </article>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {organizedActive.length === 0 &&
              captainedActive.length === 0 &&
              championRows.length > 0 && (
                <section className="mt-12 rounded-lg border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
                  <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                    Nothing active right now
                  </p>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight">
                    Run it back?
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
                    Spin up a fresh league to play with the same crew, or jump
                    in via an invite link.
                  </p>
                  <div className="mt-6 flex justify-center">
                    <Button asChild>
                      <Link href="/leagues/new">Create a league</Link>
                    </Button>
                  </div>
                </section>
              )}

            {championRows.length > 0 && (
              <section className="mt-12">
                <SectionHeader
                  title="Past leagues"
                  count={championRows.length}
                />
                <ul className="mt-5 flex flex-col gap-3">
                  {championRows.map((row) => {
                    const linkHref =
                      row.role === "organizer"
                        ? `/leagues/${row.leagueSlug}/manage`
                        : `/leagues/${row.leagueSlug}`;
                    return (
                      <li key={row.leagueId}>
                        <Link
                          href={linkHref}
                          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <article className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-zinc-600 hover:bg-surface-elevated">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <LeagueStateBadge state={row.leagueState} />
                                <span className="font-mono text-xs text-foreground-subtle">
                                  {row.game}
                                </span>
                              </div>
                              <h3 className="mt-3 truncate text-base font-semibold tracking-tight">
                                {row.leagueName}
                              </h3>
                            </div>
                            <div className="min-w-0 text-right">
                              {row.leagueState === "COMPLETED" &&
                              row.championName ? (
                                <>
                                  <p
                                    className="font-mono text-[11px] uppercase text-foreground-subtle"
                                    style={{ letterSpacing: "0.16em" }}
                                  >
                                    Champion
                                  </p>
                                  <p
                                    className={`mt-1 truncate text-sm font-semibold ${row.youWon ? "text-success" : "text-foreground"}`}
                                  >
                                    {row.championName}
                                    {row.youWon && (
                                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-success">
                                        you
                                      </span>
                                    )}
                                  </p>
                                  {row.yourTeamName && !row.youWon && (
                                    <p className="mt-0.5 truncate text-xs text-foreground-subtle">
                                      Your team: {row.yourTeamName}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="font-mono text-xs text-foreground-subtle">
                                  {row.leagueState === "CANCELLED"
                                    ? "Cancelled"
                                    : "No champion"}
                                </p>
                              )}
                            </div>
                          </article>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  const accentColor = accent && value > 0 ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        {label}
      </p>
      <p
        className={`mt-3 font-mono text-3xl font-semibold tracking-tight ${accentColor}`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        {title}
      </h2>
      <span className="font-mono text-xs text-foreground-subtle">
        ({count})
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="text-foreground-subtle">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}
