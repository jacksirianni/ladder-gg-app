import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/card";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { NextSteps } from "@/components/next-steps";
import { RegistrationStatus } from "@/components/registration-status";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VisibilityPill } from "@/components/visibility-pill";
import { canJoinLeague } from "@/lib/league-access";
import { JoinForm } from "./form";

export const metadata: Metadata = {
  title: "Join league",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function JoinLeaguePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { token } = await searchParams;
  const tokenStr = token ?? "";

  const session = await auth();
  if (!session?.user) {
    // v1.2: preserve invite link through auth so the captain lands back here.
    const here = `/leagues/${slug}/join${tokenStr ? `?token=${encodeURIComponent(tokenStr)}` : ""}`;
    redirect(`/signin?redirectTo=${encodeURIComponent(here)}`);
  }

  const league = await prisma.league.findUnique({
    where: { slug },
    include: { _count: { select: { teams: true } } },
  });
  if (!league) notFound();
  // DRAFT leagues 404 to non-organizers — the public page does the same.
  if (league.state === "DRAFT") notFound();

  // Already on a team in this league? Bounce to the public page.
  const existing = await prisma.team.findUnique({
    where: {
      leagueId_captainUserId: {
        leagueId: league.id,
        captainUserId: session.user.id,
      },
    },
    select: { id: true },
  });
  if (existing) {
    redirect(`/leagues/${slug}`);
  }

  // v1.6: single source of truth for the join decision. The action layer
  // re-checks inside a transaction; here we just decide what to render.
  const access = canJoinLeague(
    {
      state: league.state,
      visibility: league.visibility,
      inviteToken: league.inviteToken,
      maxTeams: league.maxTeams,
      registrationClosesAt: league.registrationClosesAt,
    },
    {
      viewerId: session.user.id,
      viewerHasTeam: false,
      token: tokenStr,
      teamCount: league._count.teams,
    },
  );

  // Block states render their own card and short-circuit.
  if (access.kind !== "ALLOW") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <LeagueStateBadge state={league.state} />
              <VisibilityPill visibility={league.visibility} />
            </div>
            {access.kind === "BLOCK_NOT_OPEN" && (
              <>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                  Registration is not open.
                </h1>
                <p className="mt-2 text-foreground-muted">
                  {access.state === "IN_PROGRESS" &&
                    "This league has already started."}
                  {access.state === "COMPLETED" &&
                    "This league has finished."}
                  {access.state === "CANCELLED" &&
                    "This league was cancelled."}
                </p>
              </>
            )}
            {access.kind === "BLOCK_DEADLINE" && (
              <>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                  Registration has closed.
                </h1>
                <p className="mt-2 text-foreground-muted">
                  The organizer set a deadline that&apos;s now passed.
                </p>
                <div className="mt-3">
                  <RegistrationStatus closesAt={access.closesAt} />
                </div>
              </>
            )}
            {access.kind === "BLOCK_FULL" && (
              <>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                  This league is full.
                </h1>
                <p className="mt-2 text-foreground-muted">
                  All {access.maxTeams} team slots are filled. Check back if a
                  slot opens up.
                </p>
              </>
            )}
            {access.kind === "BLOCK_NEEDS_TOKEN" && (
              <>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                  Invite link required.
                </h1>
                <p className="mt-2 text-foreground-muted">
                  Captains need an invite link from the organizer to register
                  for this league.
                </p>
              </>
            )}
            {access.kind === "BLOCK_BAD_TOKEN" && (
              <>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                  Invite link is invalid.
                </h1>
                <p className="mt-2 text-foreground-muted">
                  The link may have been rotated by the organizer. Ask them
                  for a fresh invite link.
                </p>
              </>
            )}
          </Card>
        </main>
        <SiteFooter />
      </>
    );
  }

  const captainDisplayName =
    session.user.name ?? session.user.email ?? "you";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:px-12">
        {/* v1.2: clearer header */}
        <div className="flex flex-wrap items-center gap-3">
          <LeagueStateBadge state={league.state} />
          <VisibilityPill visibility={league.visibility} />
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
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
          {league._count.teams} of {league.maxTeams} teams registered
          {" · "}
          Entry ${(league.buyInCents / 100).toFixed(2)}
        </p>

        {/* v1.6: visibility banner — sets expectations on the join policy. */}
        <div
          className={
            "mt-6 rounded-md border px-4 py-3 text-sm " +
            (league.visibility === "OPEN_JOIN"
              ? "border-primary/30 bg-primary/5 text-foreground"
              : "border-border bg-surface text-foreground-muted")
          }
          role="note"
        >
          {league.visibility === "OPEN_JOIN" ? (
            <>
              <span className="font-semibold text-primary">
                Open registration —
              </span>{" "}
              anyone with this link can join this league.
            </>
          ) : (
            <>
              <span className="font-semibold">Invite required</span> to join
              this league. The organizer shared this link with you directly.
            </>
          )}
        </div>

        {/* Deadline countdown if set. */}
        {league.registrationClosesAt && (
          <div className="mt-3">
            <RegistrationStatus closesAt={league.registrationClosesAt} />
          </div>
        )}

        {/* v1.2: explicit captain identity panel */}
        <div className="mt-8 rounded-lg border border-border bg-surface px-5 py-4">
          <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            You are joining as
          </p>
          <p className="mt-1 text-base font-semibold">
            {captainDisplayName}{" "}
            <span className="text-foreground-muted">(captain)</span>
          </p>
          <p className="mt-1 text-xs text-foreground-subtle">
            You will be the only person from your team who can report or
            confirm match results.
          </p>
        </div>

        {/* v1.4: clearer "what happens next" flow for first-time captains */}
        <NextSteps
          className="mt-6"
          eyebrow="How this works"
          steps={[
            {
              title: "Register your team",
              body: `Pick a team name${
                league.teamSize > 1
                  ? ` and add ${league.teamSize - 1} teammate${league.teamSize - 1 === 1 ? "" : "s"}`
                  : ""
              }.`,
              current: true,
            },
            {
              title:
                league.buyInCents > 0
                  ? "Pay the entry fee"
                  : "Wait for the bracket",
              body:
                league.buyInCents > 0
                  ? "The organizer will tell you exactly how to pay (Venmo, Cash App, etc.) and mark you paid once they receive it."
                  : "This is a free league. Once the organizer starts it, your matches will appear on the league page.",
            },
            {
              title: "Report your matches",
              body: "When a match is ready, you'll see it on your dashboard. Report the score; the other captain confirms. Disputes go to the organizer.",
            },
          ]}
        />

        <h2 className="mt-10 text-lg font-semibold">Register your team</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Set the team name and add{" "}
          {Math.max(0, league.teamSize - 1)} other player
          {league.teamSize - 1 === 1 ? "" : "s"}.
        </p>

        <div className="mt-6">
          <JoinForm
            slug={slug}
            token={tokenStr}
            teamSize={league.teamSize}
            buyInCents={league.buyInCents}
            paymentInstructions={league.paymentInstructions}
            captainDisplayName={captainDisplayName}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
