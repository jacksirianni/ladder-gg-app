import Link from "next/link";
import { redirect } from "next/navigation";
import type { PaymentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteHeader } from "@/components/site-header";

const paymentLabel: Record<PaymentStatus, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  WAIVED: "Waived",
  REFUNDED: "Refunded",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const [organized, captained] = await Promise.all([
    prisma.league.findMany({
      where: { organizerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team.findMany({
      where: { captainUserId: user.id },
      orderBy: { createdAt: "desc" },
      include: { league: true },
    }),
  ]);

  const hasAnything = organized.length > 0 || captained.length > 0;

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
              Leagues you are organizing or playing in.
            </p>
          </div>
          <Button asChild>
            <Link href="/leagues/new">Create a league</Link>
          </Button>
        </header>

        {!hasAnything ? (
          <section className="mt-10">
            <EmptyState
              title="No leagues yet"
              description="Create your first league, or join one with an invite link from an organizer."
              action={
                <Button asChild>
                  <Link href="/leagues/new">Create a league</Link>
                </Button>
              }
            />
          </section>
        ) : (
          <>
            {organized.length > 0 && (
              <section className="mt-10">
                <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                  Organizing
                </h2>
                <ul className="mt-4 grid gap-4 md:grid-cols-2">
                  {organized.map((league) => (
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
                            Entry fee ${(league.buyInCents / 100).toFixed(2)} · up to{" "}
                            {league.maxTeams} teams
                          </p>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {captained.length > 0 && (
              <section className="mt-12">
                <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                  Playing in
                </h2>
                <ul className="mt-4 grid gap-4 md:grid-cols-2">
                  {captained.map((team) => (
                    <li key={team.id}>
                      <Link
                        href={`/leagues/${team.league.slug}`}
                        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <Card interactive>
                          <div className="flex items-center justify-between gap-3">
                            <LeagueStateBadge state={team.league.state} />
                            <span className="font-mono text-xs text-foreground-subtle">
                              {paymentLabel[team.paymentStatus]}
                            </span>
                          </div>
                          <h3 className="mt-4 text-lg font-semibold">
                            {team.league.name}
                          </h3>
                          <p className="mt-1 text-sm text-foreground-muted">
                            Captain of{" "}
                            <span className="text-foreground">{team.name}</span>
                          </p>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
