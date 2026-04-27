import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InviteLinkBox } from "@/components/invite-link-box";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteHeader } from "@/components/site-header";
import {
  canCancelLeague,
  canPublishLeague,
} from "@/lib/transitions/league";
import {
  cancelLeagueAction,
  publishLeagueAction,
} from "./actions";

type Props = {
  params: Promise<{ slug: string }>;
};

const payoutLabels: Record<string, string> = {
  WTA: "Winner takes all",
  TOP_2: "Top 2 — 70 / 30",
  TOP_3: "Top 3 — 60 / 30 / 10",
};

export default async function ManageLeaguePage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const league = await prisma.league.findUnique({
    where: { slug },
  });
  if (!league) notFound();
  if (league.organizerId !== session.user.id) notFound();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${proto}://${host}/leagues/${league.slug}/join?token=${league.inviteToken}`;

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

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              Team size
            </h3>
            <p className="mt-2 font-mono text-xl">{league.teamSize}</p>
          </Card>
          <Card>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              Max teams
            </h3>
            <p className="mt-2 font-mono text-xl">{league.maxTeams}</p>
          </Card>
          <Card>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              Buy-in
            </h3>
            <p className="mt-2 font-mono text-xl">
              ${(league.buyInCents / 100).toFixed(2)}
            </p>
          </Card>
          <Card>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              Payout
            </h3>
            <p className="mt-2 font-mono text-sm">
              {payoutLabels[league.payoutPreset]}
            </p>
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Invite link
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Share this with your captains. Anyone with the link can register a team.
          </p>
          <div className="mt-4">
            <InviteLinkBox url={inviteUrl} />
          </div>
        </section>

        <section className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
          {canPublishLeague(league) && (
            <form action={publishLeagueAction}>
              <input type="hidden" name="leagueId" value={league.id} />
              <Button type="submit">Publish league</Button>
            </form>
          )}
          {canCancelLeague(league) && (
            <form action={cancelLeagueAction}>
              <input type="hidden" name="leagueId" value={league.id} />
              <Button type="submit" variant="destructive">
                Cancel league
              </Button>
            </form>
          )}
          {league.state !== "DRAFT" && (
            <Button asChild variant="secondary">
              <Link href={`/leagues/${league.slug}`}>View public page</Link>
            </Button>
          )}
        </section>
      </main>
    </>
  );
}
