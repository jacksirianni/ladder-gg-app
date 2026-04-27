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
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteHeader } from "@/components/site-header";
import { TeamCard } from "@/components/team-card";

type Props = {
  params: Promise<{ slug: string }>;
};

const payoutLabels: Record<string, string> = {
  WTA: "Winner takes all",
  TOP_2: "Top 2 — 70 / 30",
  TOP_3: "Top 3 — 60 / 30 / 10",
};

export default async function PublicLeaguePage({ params }: Props) {
  const { slug } = await params;

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
    },
  });
  if (!league || league.state === "DRAFT") notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const isOrganizer = viewerId === league.organizerId;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 md:px-12">
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

        <div className="mt-10">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="teams">
                Teams ({league.teams.length})
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
                Entry fees and prizes are managed by the organizer off-platform. LADDER tracks teams, brackets, and results.
              </p>

              <p className="mt-4 rounded-md border border-dashed border-border bg-surface/40 px-4 py-3 text-sm text-foreground-muted">
                Bracket appears once the organizer starts the league.
              </p>
            </TabsContent>

            <TabsContent value="teams" className="mt-6">
              {league.teams.length === 0 ? (
                <EmptyState
                  title="No teams yet"
                  description={
                    league.state === "OPEN"
                      ? "Be the first to register via the organizer's invite link."
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
          </Tabs>
        </div>
      </main>
    </>
  );
}
