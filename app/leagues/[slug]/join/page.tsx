import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/card";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteHeader } from "@/components/site-header";
import { JoinForm } from "./form";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function JoinLeaguePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { token } = await searchParams;

  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  if (!token) notFound();

  const league = await prisma.league.findUnique({
    where: { slug },
    include: { _count: { select: { teams: true } } },
  });
  if (!league) notFound();
  if (league.inviteToken !== token) notFound();

  // Already on a team in this league? Bounce to the public page.
  const existing = await prisma.team.findUnique({
    where: {
      leagueId_captainUserId: {
        leagueId: league.id,
        captainUserId: session.user.id,
      },
    },
  });
  if (existing) {
    redirect(`/leagues/${slug}`);
  }

  if (league.state !== "OPEN") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
          <Card>
            <div className="flex items-center gap-3">
              <LeagueStateBadge state={league.state} />
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Registration is not open.
            </h1>
            <p className="mt-2 text-foreground-muted">
              {league.state === "DRAFT" &&
                "The organizer has not published this league yet."}
              {league.state === "IN_PROGRESS" &&
                "This league has already started."}
              {league.state === "COMPLETED" && "This league has finished."}
              {league.state === "CANCELLED" && "This league was cancelled."}
            </p>
          </Card>
        </main>
      </>
    );
  }

  if (league._count.teams >= league.maxTeams) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
          <Card>
            <h1 className="text-2xl font-semibold tracking-tight">
              This league is full.
            </h1>
            <p className="mt-2 text-foreground-muted">
              All {league.maxTeams} team slots are filled. Check back if a slot
              opens up.
            </p>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <LeagueStateBadge state={league.state} />
          <span className="font-mono text-xs text-foreground-subtle">
            {league.game}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Register your team
        </h1>
        <p className="mt-2 text-foreground-muted">
          Joining{" "}
          <span className="text-foreground">{league.name}</span>. You will be
          the captain.
        </p>

        <div className="mt-8">
          <JoinForm
            slug={slug}
            token={token}
            teamSize={league.teamSize}
            buyInCents={league.buyInCents}
            captainDisplayName={
              session.user.name ?? session.user.email ?? "you"
            }
          />
        </div>
      </main>
    </>
  );
}
