import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteHeader } from "@/components/site-header";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const leagues = await prisma.league.findMany({
    where: { organizerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:px-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Hi, {user.displayName}
            </h1>
            <p className="mt-2 text-foreground-muted">
              Leagues you are organizing.
            </p>
          </div>
          <Button asChild>
            <Link href="/leagues/new">Create a league</Link>
          </Button>
        </header>

        <section className="mt-10">
          {leagues.length === 0 ? (
            <EmptyState
              title="No leagues yet"
              description="Create your first league, or join one with an invite link from an organizer."
              action={
                <Button asChild>
                  <Link href="/leagues/new">Create a league</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {leagues.map((league) => (
                <li key={league.id}>
                  <Link
                    href={`/leagues/${league.slug}/manage`}
                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Card interactive>
                      <div className="flex items-center justify-between gap-3">
                        <LeagueStateBadge state={league.state} />
                        <span className="font-mono text-xs text-foreground-subtle">
                          {league.game}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold">
                        {league.name}
                      </h3>
                      <p className="mt-1 text-sm text-foreground-muted">
                        Buy-in ${(league.buyInCents / 100).toFixed(2)} · up to{" "}
                        {league.maxTeams} teams
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
