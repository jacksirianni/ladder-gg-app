import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BracketView } from "@/components/bracket-view";
import { ChampionHero } from "@/components/champion-hero";
import { ConfirmButton } from "@/components/confirm-button";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SampleBracketPreview } from "@/components/sample-bracket-preview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TeamCard } from "@/components/team-card";
import { ViewerCta } from "@/components/viewer-cta";
import { MatchesTab } from "./matches-tab";
import { leaveTeamAction } from "./actions";
import { EditTeamButton } from "./edit-team-modal";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ match?: string }>;
};

const payoutLabels: Record<string, string> = {
  WTA: "Winner takes all",
  TOP_2: "Top 2 — 70 / 30",
  TOP_3: "Top 3 — 60 / 30 / 10",
};

const stateLabel: Record<string, string> = {
  OPEN: "Registration open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DRAFT: "Draft",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const league = await prisma.league.findUnique({
    where: { slug },
    include: { _count: { select: { teams: true } } },
  });
  if (!league || league.state === "DRAFT") {
    return {};
  }
  const description = `${league.game} · ${league._count.teams}/${league.maxTeams} teams · ${stateLabel[league.state]}`;
  return {
    title: league.name,
    description,
    openGraph: {
      title: league.name,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: league.name,
      description,
    },
  };
}

export default async function PublicLeaguePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { match: initialMatchParam } = await searchParams;

  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      organizer: { select: { id: true, displayName: true } },
      teams: {
        orderBy: { createdAt: "asc" },
        include: {
          captain: { select: { id: true, displayName: true } },
          roster: { orderBy: { position: "asc" } },
        },
      },
      matches: {
        orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
        include: {
          teamA: {
            select: { id: true, name: true, captainUserId: true },
          },
          teamB: {
            select: { id: true, name: true, captainUserId: true },
          },
          resolvedBy: { select: { displayName: true } },
          disputedBy: { select: { displayName: true } },
          reports: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              reportedByUserId: true,
              reportedWinnerTeamId: true,
              scoreText: true,
              createdAt: true,
              reportedBy: { select: { displayName: true } },
            },
          },
        },
      },
    },
  });
  if (!league || league.state === "DRAFT") notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const isOrganizer = viewerId === league.organizerId;

  const captainTeam = viewerId
    ? league.teams.find((t) => t.captainUserId === viewerId)
    : null;
  const canLeave = captainTeam && league.state === "OPEN";
  const canEditTeam = captainTeam && league.state === "OPEN";

  const finalMatch =
    league.matches.length > 0
      ? league.matches.reduce((acc, m) =>
        m.round > acc.round ? m : acc,
        league.matches[0])
      : null;
  const winnerTeam =
    league.state === "COMPLETED" && finalMatch?.winnerTeamId
      ? league.teams.find((t) => t.id === finalMatch.winnerTeamId) ?? null
      : null;
  const runnerUpId =
    league.state === "COMPLETED" && finalMatch?.winnerTeamId
      ? finalMatch.teamAId === finalMatch.winnerTeamId
        ? finalMatch.teamBId
        : finalMatch.teamAId
      : null;
  const runnerUpName = runnerUpId
    ? league.teams.find((t) => t.id === runnerUpId)?.name ?? null
    : null;
  const matchesPlayed = league.matches.filter(
    (m) => m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED",
  ).length;
  const disputesCount = league.matches.filter(
    (m) => m.disputedAt !== null,
  ).length;

  const showBracket =
    league.state === "IN_PROGRESS" || league.state === "COMPLETED";

  // v1.4: dashboard action queue deep-links here with ?match=<id>. Only honor
  // the param if it matches a real match in this league so we don't open a
  // ghost modal.
  const initialMatchId =
    initialMatchParam &&
    league.matches.some((m) => m.id === initialMatchParam)
      ? initialMatchParam
      : null;

  const matchesForTab = league.matches.map((m) => ({
    id: m.id,
    round: m.round,
    bracketPosition: m.bracketPosition,
    status: m.status,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    winnerTeamId: m.winnerTeamId,
    confirmedAt: m.confirmedAt ? m.confirmedAt.toISOString() : null,
    disputedAt: m.disputedAt ? m.disputedAt.toISOString() : null,
    teamA: m.teamA,
    teamB: m.teamB,
    resolvedBy: m.resolvedBy,
    disputedBy: m.disputedBy,
    reports: m.reports.map((r) => ({
      reportedByUserId: r.reportedByUserId,
      reportedWinnerTeamId: r.reportedWinnerTeamId,
      scoreText: r.scoreText,
      createdAt: r.createdAt.toISOString(),
      reportedBy: r.reportedBy,
    })),
  }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <LeagueStateBadge state={league.state} />
          <span className="font-mono text-xs text-foreground-subtle">
            {league.game}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {league.name}
        </h1>
        {league.description && (
          <p className="mt-2 text-foreground-muted">{league.description}</p>
        )}
        <p className="mt-2 text-sm text-foreground-subtle">
          Organized by {league.organizer.displayName}
        </p>

        {/* v1.4: OPEN-state hero highlights registration progress + format. */}
        {league.state === "OPEN" && (
          <section
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-5 py-4"
            aria-label="Registration open"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-widest text-primary">
                Registration open
              </p>
              <p className="mt-1 text-sm">
                <span className="font-semibold">
                  {league.teams.length} of {league.maxTeams}
                </span>{" "}
                teams registered
                <span className="text-foreground-subtle"> · </span>
                <span className="font-mono text-xs">
                  {league.teamSize === 1
                    ? "1v1"
                    : `${league.teamSize}v${league.teamSize}`}
                </span>
                <span className="text-foreground-subtle"> · </span>
                <span>
                  Entry $
                  {(league.buyInCents / 100).toFixed(2)}
                </span>
              </p>
            </div>
            {!captainTeam && league.teams.length < league.maxTeams && (
              <p className="font-mono text-xs text-foreground-subtle">
                Captains: ask the organizer for the invite link.
              </p>
            )}
          </section>
        )}

        {captainTeam && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-5 py-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                Your team
              </p>
              <p className="mt-1 font-semibold">{captainTeam.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canEditTeam && (
                <EditTeamButton
                  team={{
                    id: captainTeam.id,
                    name: captainTeam.name,
                    roster: captainTeam.roster.map((r) => ({
                      displayName: r.displayName,
                      position: r.position,
                    })),
                  }}
                  teamSize={league.teamSize}
                />
              )}
              {canLeave && (
                <ConfirmButton
                  triggerLabel="Leave team"
                  triggerVariant="ghost"
                  triggerSize="sm"
                  title="Leave this team?"
                  description="Your team will be removed from the league. The captain spot will be open and you'll need a new invite to rejoin."
                  confirmLabel="Leave team"
                  confirmVariant="destructive"
                  action={leaveTeamAction}
                  hiddenFields={{ teamId: captainTeam.id }}
                />
              )}
            </div>
          </div>
        )}

        {winnerTeam && (
          <ChampionHero
            leagueId={league.id}
            winnerTeam={{
              id: winnerTeam.id,
              name: winnerTeam.name,
              captain: { displayName: winnerTeam.captain.displayName },
              roster: winnerTeam.roster.map((r) => ({
                displayName: r.displayName,
                position: r.position,
              })),
            }}
            runnerUpName={runnerUpName}
            totalTeams={league.teams.length}
            matchesPlayed={matchesPlayed}
            disputesCount={disputesCount}
            isOrganizer={isOrganizer}
          />
        )}

        <div className="mt-10">
          <Tabs defaultValue={initialMatchId ? "matches" : "overview"}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="teams">
                Teams ({league.teams.length})
              </TabsTrigger>
              <TabsTrigger value="matches">
                Matches ({league.matches.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
                    Team size
                  </h3>
                  <p className="mt-2 font-mono text-xl">{league.teamSize}</p>
                </Card>
                <Card>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
                    Teams
                  </h3>
                  <p className="mt-2 font-mono text-xl">
                    {league.teams.length} / {league.maxTeams}
                  </p>
                </Card>
                <Card>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
                    Entry fee
                  </h3>
                  <p className="mt-2 font-mono text-xl">
                    ${(league.buyInCents / 100).toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    Organizer-managed
                  </p>
                </Card>
                <Card>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
                    Prize split
                  </h3>
                  <p className="mt-2 font-mono text-sm">
                    {payoutLabels[league.payoutPreset]}
                  </p>
                </Card>
              </div>

              {league.prizeNotes && (
                <div className="mt-8 rounded-lg border border-border bg-surface p-5">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                    Prize notes
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm">
                    {league.prizeNotes}
                  </p>
                </div>
              )}

              {league.paymentInstructions && (
                <div className="mt-4 rounded-lg border border-border bg-surface p-5">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                    Payment instructions
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm">
                    {league.paymentInstructions}
                  </p>
                </div>
              )}

              <p className="mt-8 rounded-md border border-dashed border-border bg-surface/40 px-4 py-3 text-xs text-foreground-subtle">
                Entry fees and prizes are managed by the organizer off-platform.
                LADDER tracks teams, brackets, and results.
              </p>

              {showBracket ? (
                <div className="mt-8">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                    Bracket
                  </h2>
                  <div className="mt-4">
                    <BracketView matches={league.matches} />
                  </div>
                </div>
              ) : (
                // v1.4: show a placeholder bracket so viewers can picture
                // the format before the league starts.
                <div className="mt-8">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                    Bracket preview
                  </h2>
                  <div className="mt-4 rounded-lg border border-dashed border-border bg-surface/30 p-4">
                    <SampleBracketPreview
                      maxTeams={league.maxTeams}
                      filledTeams={league.teams.length}
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="teams" className="mt-6">
              {league.teams.length === 0 ? (
                <EmptyState
                  title="No teams yet"
                  description={
                    league.state === "OPEN"
                      ? "Up to " +
                        league.maxTeams +
                        " teams can register. Captains need an invite link from the organizer."
                      : "Registration was not opened for this league."
                  }
                />
              ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {league.teams.map((team) => {
                    const isOwnTeam = viewerId === team.captainUserId;
                    const showPayment = isOrganizer || isOwnTeam;
                    return (
                      <li key={team.id}>
                        <TeamCard team={team} showPayment={showPayment} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="matches" className="mt-6">
              <MatchesTab
                matches={matchesForTab}
                viewerId={viewerId}
                isOrganizer={isOrganizer}
                initialMatchId={initialMatchId}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* v1.4: gentle signup hook for unauthenticated viewers. */}
        {viewerId === null && (
          <ViewerCta redirectTo={`/leagues/${league.slug}`} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
