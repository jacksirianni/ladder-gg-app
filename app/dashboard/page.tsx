import Link from "next/link";
import { redirect } from "next/navigation";
import type { LeagueState, PaymentStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteHeader } from "@/components/site-header";

const paymentLabel: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  WAIVED: "Waived",
  REFUNDED: "Refunded",
};

const ACTIVE_STATES = new Set<LeagueState>(["OPEN", "IN_PROGRESS"]);

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
      },
    }),
    prisma.team.findMany({
      where: { captainUserId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        league: {
          include: { _count: { select: { teams: true } } },
        },
      },
    }),
  ]);

  const hasAnything = organized.length > 0 || captained.length > 0;

  // Active = OPEN or IN_PROGRESS, deduped across both roles
  // (a user can be organizer AND captain in the same league).
  const activeIds = new Set<string>();
  for (const l of organized) {
    if (ACTIVE_STATES.has(l.state)) activeIds.add(l.id);
  }
  for (const t of captained) {
    if (ACTIVE_STATES.has(t.league.state)) activeIds.add(t.league.id);
  }
  const activeCount = activeIds.size;

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
            {organized.length > 0 && (
              <section className="mt-12">
                <SectionHeader
                  title="Organizing"
                  count={organized.length}
                />
                <ul className="mt-5 grid gap-3 md:grid-cols-2">
                  {organized.map((league) => (
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

            {captained.length > 0 && (
              <section className="mt-10">
                <SectionHeader
                  title="Playing in"
                  count={captained.length}
                />
                <ul className="mt-5 grid gap-3 md:grid-cols-2">
                  {captained.map((team) => (
                    <li key={team.id}>
                      <Link
                        href={`/leagues/${team.league.slug}`}
                        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <article className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-zinc-600 hover:bg-surface-elevated">
                          <div className="flex items-start justify-between gap-3">
                            <LeagueStateBadge state={team.league.state} />
                            <span className="font-mono text-xs text-foreground-subtle">
                              {team.league.game}
                            </span>
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
