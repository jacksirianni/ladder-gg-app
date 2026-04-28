import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { LeagueState, PaymentStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CopyMessageBox } from "@/components/copy-message-box";
import { InviteLinkBox } from "@/components/invite-link-box";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteHeader } from "@/components/site-header";
import {
  canCancelLeague,
  canPublishLeague,
} from "@/lib/transitions/league";
import {
  bulkUpdatePaymentStatusAction,
  cancelLeagueAction,
  duplicateLeagueAction,
  publishLeagueAction,
  removeTeamAction,
  resolveDisputeAction,
  startLeagueAction,
  updateTeamPaymentStatusAction,
} from "./actions";
import { EditLeagueButton } from "./edit-modal";

type Props = {
  params: Promise<{ slug: string }>;
};

const payoutLabels: Record<string, string> = {
  WTA: "Winner takes all",
  TOP_2: "Top 2 — 70 / 30",
  TOP_3: "Top 3 — 60 / 30 / 10",
};

const paymentVariant: Record<
  PaymentStatus,
  "neutral" | "success" | "info" | "warning"
> = {
  PENDING: "neutral",
  PAID: "success",
  WAIVED: "info",
  REFUNDED: "warning",
};

const paymentLabel: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  WAIVED: "Waived",
  REFUNDED: "Refunded",
};

type ChecklistStatus = "done" | "current" | "pending";

type ChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  hidden?: boolean;
};

function buildChecklist(args: {
  state: LeagueState;
  teamCount: number;
  eligibleCount: number;
  disputedCount: number;
}): ChecklistItem[] {
  const { state, teamCount, eligibleCount, disputedCount } = args;
  const items: ChecklistItem[] = [];

  items.push({
    id: "publish",
    label: "Publish league",
    status:
      state === "DRAFT"
        ? "current"
        : state === "CANCELLED"
          ? "pending"
          : "done",
  });

  items.push({
    id: "invite",
    label: "Invite captains",
    status:
      teamCount > 0
        ? "done"
        : state === "OPEN"
          ? "current"
          : "pending",
    hidden: state === "DRAFT" || state === "CANCELLED",
  });

  items.push({
    id: "mark",
    label: "Mark teams paid or waived",
    status:
      state === "IN_PROGRESS" || state === "COMPLETED"
        ? "done"
        : eligibleCount >= 2
          ? "done"
          : state === "OPEN" && teamCount > 0
            ? "current"
            : "pending",
    hidden:
      state === "DRAFT" || state === "CANCELLED" || teamCount === 0,
  });

  items.push({
    id: "start",
    label: "Start league",
    status:
      state === "IN_PROGRESS" || state === "COMPLETED"
        ? "done"
        : state === "OPEN" && eligibleCount >= 2
          ? "current"
          : "pending",
    hidden: state === "DRAFT" || state === "CANCELLED",
  });

  if (disputedCount > 0) {
    items.push({
      id: "disputes",
      label: `Resolve ${disputedCount} dispute${disputedCount === 1 ? "" : "s"}`,
      status: "current",
    });
  }

  items.push({
    id: "complete",
    label: "League completed",
    status: state === "COMPLETED" ? "done" : "pending",
    hidden: state === "DRAFT" || state === "CANCELLED",
  });

  return items.filter((i) => !i.hidden);
}

function ChecklistDot({ status }: { status: ChecklistStatus }) {
  if (status === "done") {
    return (
      <span
        aria-hidden
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground"
      >
        ✓
      </span>
    );
  }
  if (status === "current") {
    return (
      <span
        aria-hidden
        className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 shrink-0 rounded-full border border-border bg-surface"
    />
  );
}

export default async function ManageLeaguePage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      teams: {
        orderBy: { createdAt: "asc" },
        include: {
          captain: { select: { displayName: true } },
        },
      },
    },
  });
  if (!league) notFound();
  if (league.organizerId !== session.user.id) notFound();

  const disputedMatches = await prisma.match.findMany({
    where: { leagueId: league.id, status: "DISPUTED" },
    orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
    include: {
      teamA: { select: { id: true, name: true } },
      teamB: { select: { id: true, name: true } },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          reportedBy: { select: { displayName: true } },
          reportedWinnerTeam: { select: { id: true, name: true } },
        },
      },
    },
  });

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${proto}://${host}/leagues/${league.slug}/join?token=${league.inviteToken}`;
  const publicUrl = `${proto}://${host}/leagues/${league.slug}`;

  // v1.2: friendly invite message captains can paste anywhere.
  const entryFeeForMessage =
    league.buyInCents > 0
      ? `Entry: $${(league.buyInCents / 100).toFixed(2)}`
      : "Free league";
  const inviteMessage = [
    `You're invited to ${league.name} on LADDER.gg.`,
    `${league.game} · Team size ${league.teamSize} · ${entryFeeForMessage}`,
    "",
    `Register your team here: ${inviteUrl}`,
  ].join("\n");

  const paidTeams = league.teams.filter(
    (t) => t.paymentStatus === "PAID",
  ).length;
  const pendingTeamsCount = league.teams.filter(
    (t) => t.paymentStatus === "PENDING",
  ).length;
  const totalCollectedCents = paidTeams * league.buyInCents;

  const eligibleCount = league.teams.filter(
    (t) => t.paymentStatus === "PAID" || t.paymentStatus === "WAIVED",
  ).length;
  const canStart = league.state === "OPEN" && eligibleCount >= 2;

  const canEdit = league.state === "DRAFT" || league.state === "OPEN";
  const canRemoveTeams = canEdit;
  const canBulk = league.state === "OPEN" && pendingTeamsCount > 0;

  const checklist = buildChecklist({
    state: league.state,
    teamCount: league.teams.length,
    eligibleCount,
    disputedCount: disputedMatches.length,
  });
  const currentItem = checklist.find((i) => i.status === "current");

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

        <section className="mt-8">
          <Card>
            {currentItem ? (
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                  Next step
                </p>
                <p className="text-sm font-medium text-primary">
                  {currentItem.label}
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                  Status
                </p>
              </div>
            )}
            <ul className="flex flex-col gap-2">
              {checklist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <ChecklistDot status={item.status} />
                  <span
                    className={
                      item.status === "current"
                        ? "font-medium text-foreground"
                        : item.status === "done"
                          ? "text-foreground-muted line-through decoration-foreground-subtle/40"
                          : "text-foreground-muted"
                    }
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

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
              Entry fee
            </h3>
            <p className="mt-2 font-mono text-xl">
              ${(league.buyInCents / 100).toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-foreground-subtle">Organizer-managed</p>
          </Card>
          <Card>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              Prize split
            </h3>
            <p className="mt-2 font-mono text-sm">
              {payoutLabels[league.payoutPreset]}
            </p>
          </Card>
        </section>

        {canEdit && (
          <section className="mt-6">
            <EditLeagueButton
              league={{
                id: league.id,
                description: league.description,
                game: league.game,
                teamSize: league.teamSize,
                maxTeams: league.maxTeams,
                buyInCents: league.buyInCents,
                payoutPreset: league.payoutPreset,
                paymentInstructions: league.paymentInstructions,
                prizeNotes: league.prizeNotes,
              }}
              teamCount={league.teams.length}
            />
          </section>
        )}

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Invite link
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              For captains. Anyone with this link can register a team.
            </p>
            <div className="mt-4">
              <InviteLinkBox url={inviteUrl} />
            </div>
            <div className="mt-3">
              <CopyMessageBox
                message={inviteMessage}
                copyLabel="Copy invite message"
              />
            </div>
          </div>

          {league.state !== "DRAFT" && (
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                Public link
              </h2>
              <p className="mt-2 text-sm text-foreground-muted">
                For viewers. Anyone can see the bracket, teams, and results.
              </p>
              <div className="mt-4">
                <InviteLinkBox url={publicUrl} />
              </div>
            </div>
          )}
        </section>

        {(league.paymentInstructions || league.prizeNotes) && (
          <section className="mt-10 grid gap-4 md:grid-cols-2">
            {league.paymentInstructions && (
              <Card>
                <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                  Payment instructions
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {league.paymentInstructions}
                </p>
              </Card>
            )}
            {league.prizeNotes && (
              <Card>
                <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                  Prize notes
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {league.prizeNotes}
                </p>
              </Card>
            )}
          </section>
        )}

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                Teams
              </h2>
              <p className="mt-2 text-sm text-foreground-muted">
                {league.teams.length} of {league.maxTeams} registered
                {league.buyInCents > 0 && (
                  <>
                    {" · "}
                    <span className="text-foreground">
                      {paidTeams} paid · ${(totalCollectedCents / 100).toFixed(2)} collected
                    </span>
                  </>
                )}
                {league.state === "OPEN" && (
                  <>
                    {" · "}
                    <span className="text-foreground">
                      {eligibleCount} eligible to play
                    </span>
                  </>
                )}
              </p>
            </div>
            {canBulk && (
              <div className="flex flex-wrap gap-2">
                <form action={bulkUpdatePaymentStatusAction}>
                  <input type="hidden" name="leagueId" value={league.id} />
                  <input type="hidden" name="paymentStatus" value="PAID" />
                  <Button type="submit" size="sm" variant="secondary">
                    Mark all pending as Paid ({pendingTeamsCount})
                  </Button>
                </form>
                <form action={bulkUpdatePaymentStatusAction}>
                  <input type="hidden" name="leagueId" value={league.id} />
                  <input type="hidden" name="paymentStatus" value="WAIVED" />
                  <Button type="submit" size="sm" variant="ghost">
                    Mark all as Waived
                  </Button>
                </form>
              </div>
            )}
          </div>

          {league.teams.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-subtle">
              No teams yet. Share the invite link above.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {league.teams.map((team) => (
                <li
                  key={team.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{team.name}</p>
                      <Badge variant={paymentVariant[team.paymentStatus]}>
                        {paymentLabel[team.paymentStatus]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">
                      Captain:{" "}
                      <span className="text-foreground">
                        {team.captain.displayName}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {league.state === "OPEN" && (
                      <form
                        action={updateTeamPaymentStatusAction}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="teamId" value={team.id} />
                        <Select
                          name="paymentStatus"
                          defaultValue={team.paymentStatus}
                          className="w-auto"
                          aria-label={`Payment status for ${team.name}`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PAID">Paid</option>
                          <option value="WAIVED">Waived</option>
                          <option value="REFUNDED">Refunded</option>
                        </Select>
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                        >
                          Update
                        </Button>
                      </form>
                    )}
                    {canRemoveTeams && (
                      <form action={removeTeamAction}>
                        <input type="hidden" name="teamId" value={team.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          aria-label={`Remove ${team.name}`}
                        >
                          Remove
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {disputedMatches.length > 0 && (
          <section className="mt-10">
            <h2 className="font-mono text-xs uppercase tracking-widest text-destructive">
              Disputes ({disputedMatches.length})
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              The captains disagreed on a result. Declare the winner to advance the bracket.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {disputedMatches.map((match) => {
                const report = match.reports[0];
                return (
                  <li
                    key={match.id}
                    className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs text-foreground-subtle">
                        R{match.round} · M{match.bracketPosition}
                      </span>
                      <Badge variant="destructive">Disputed</Badge>
                    </div>
                    <p className="mt-2 text-sm">
                      <span className="font-medium">
                        {match.teamA?.name ?? "TBD"}
                      </span>
                      <span className="px-2 text-foreground-subtle">vs</span>
                      <span className="font-medium">
                        {match.teamB?.name ?? "TBD"}
                      </span>
                    </p>
                    {report && (
                      <p className="mt-1 text-sm text-foreground-muted">
                        Reported by{" "}
                        <span className="text-foreground">
                          {report.reportedBy.displayName}
                        </span>
                        :{" "}
                        <span className="text-foreground">
                          {report.reportedWinnerTeam.name}
                        </span>{" "}
                        won
                        {report.scoreText && (
                          <>
                            {" "}
                            <span className="font-mono">({report.scoreText})</span>
                          </>
                        )}
                      </p>
                    )}
                    <form
                      action={resolveDisputeAction}
                      className="mt-4 flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="matchId" value={match.id} />
                      <Select
                        name="winnerTeamId"
                        required
                        defaultValue=""
                        aria-label={`Declare winner for match R${match.round} M${match.bracketPosition}`}
                        className="w-auto"
                      >
                        <option value="" disabled>
                          Declare winner
                        </option>
                        {match.teamA && (
                          <option value={match.teamA.id}>
                            {match.teamA.name}
                          </option>
                        )}
                        {match.teamB && (
                          <option value={match.teamB.id}>
                            {match.teamB.name}
                          </option>
                        )}
                      </Select>
                      <Button type="submit" size="sm">
                        Resolve
                      </Button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
          {canPublishLeague(league) && (
            <form action={publishLeagueAction}>
              <input type="hidden" name="leagueId" value={league.id} />
              <Button type="submit">Publish league</Button>
            </form>
          )}
          {canStart && (
            <form action={startLeagueAction}>
              <input type="hidden" name="leagueId" value={league.id} />
              <Button type="submit">
                Start league ({eligibleCount} teams)
              </Button>
            </form>
          )}
          {league.state === "OPEN" && eligibleCount < 2 && (
            <p className="text-sm text-foreground-muted">
              Need at least 2 teams marked PAID or WAIVED to start the bracket.
              {eligibleCount === 1 && " 1 eligible so far."}
            </p>
          )}
          <form action={duplicateLeagueAction}>
            <input type="hidden" name="leagueId" value={league.id} />
            <Button type="submit" variant="secondary">
              Duplicate league
            </Button>
          </form>
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
