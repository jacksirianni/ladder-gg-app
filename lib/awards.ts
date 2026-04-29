/**
 * v2.0-F: per-league awards.
 *
 * Two flavors:
 *
 *   - Auto awards (CHAMPION, RUNNER_UP) are emitted inside the cascade
 *     transaction the moment a match decision flips a league to
 *     COMPLETED. They're idempotent upserts so re-resolutions and
 *     organizer overrides keep the award in sync.
 *
 *   - MVP is voted by participants. Voting opens at completion and
 *     closes when (a) every team captain has cast a ballot, or
 *     (b) `MVP_VOTING_WINDOW_MS` has elapsed since `League.completedAt`.
 *     Finalization is *lazy* — `maybeFinalizeMvp` is invoked from read
 *     paths (recap / league page / vote action) so we don't need a cron.
 *     Ties at the top → no MVP awarded.
 *
 * Roster entries aren't user-linked (they're free-text display names),
 * so the MVP candidate pool is captains-only for v2.0-F. Linking
 * rosters to users opens the pool up; deferred.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type TxLike = Prisma.TransactionClient;

/** Voting window length once the league completes. */
export const MVP_VOTING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------
// Auto awards: CHAMPION + RUNNER_UP
// ---------------------------------------------------------------

/**
 * Emit (or refresh) CHAMPION + RUNNER_UP awards for the given league.
 * Called from `markLeagueCompleted` inside the cascade transaction so
 * awards land atomically with the COMPLETED state flip.
 *
 * Re-resolving the final (override / dispute reversal) re-runs this
 * via the cascade and the upserts keep the award pointing at the
 * current winning team's captain.
 */
export async function emitChampionshipAwards(
  tx: TxLike,
  leagueId: string,
): Promise<void> {
  const league = await tx.league.findUnique({
    where: { id: leagueId },
    select: {
      format: true,
      matches: {
        select: {
          id: true,
          bracket: true,
          round: true,
          status: true,
          teamAId: true,
          teamBId: true,
          winnerTeamId: true,
        },
      },
    },
  });
  if (!league) return;

  const finalMatch = pickFinalMatch(league);
  if (!finalMatch || !finalMatch.winnerTeamId) return;

  const winnerTeamId = finalMatch.winnerTeamId;
  const loserTeamId =
    finalMatch.teamAId === winnerTeamId
      ? finalMatch.teamBId
      : finalMatch.teamAId;

  const winnerTeam = await tx.team.findUnique({
    where: { id: winnerTeamId },
    select: { captainUserId: true },
  });
  if (!winnerTeam) return;

  await tx.leagueAward.upsert({
    where: { leagueId_kind: { leagueId, kind: "CHAMPION" } },
    create: {
      leagueId,
      kind: "CHAMPION",
      recipientUserId: winnerTeam.captainUserId,
      teamId: winnerTeamId,
    },
    update: {
      recipientUserId: winnerTeam.captainUserId,
      teamId: winnerTeamId,
    },
  });

  if (loserTeamId) {
    const loserTeam = await tx.team.findUnique({
      where: { id: loserTeamId },
      select: { captainUserId: true },
    });
    if (loserTeam) {
      await tx.leagueAward.upsert({
        where: { leagueId_kind: { leagueId, kind: "RUNNER_UP" } },
        create: {
          leagueId,
          kind: "RUNNER_UP",
          recipientUserId: loserTeam.captainUserId,
          teamId: loserTeamId,
        },
        update: {
          recipientUserId: loserTeam.captainUserId,
          teamId: loserTeamId,
        },
      });
    }
  }
}

/**
 * Pick the championship-deciding match for both formats:
 *   - DOUBLE_ELIM: GRAND_RESET if played, else GRAND_FINAL
 *   - SINGLE_ELIM: highest-round CONFIRMED/ORGANIZER_DECIDED WB match
 * Mirrors recap-page logic so awards and recap agree on "the final".
 */
function pickFinalMatch(league: {
  format: "SINGLE_ELIM" | "DOUBLE_ELIM";
  matches: Array<{
    id: string;
    bracket: "WINNERS" | "LOSERS" | "GRAND_FINAL" | "GRAND_RESET";
    round: number;
    status:
      | "PENDING"
      | "AWAITING_REPORT"
      | "AWAITING_CONFIRM"
      | "CONFIRMED"
      | "DISPUTED"
      | "ORGANIZER_DECIDED";
    teamAId: string | null;
    teamBId: string | null;
    winnerTeamId: string | null;
  }>;
}) {
  const decided = league.matches.filter(
    (m) => m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED",
  );
  if (league.format === "DOUBLE_ELIM") {
    const reset = decided.find((m) => m.bracket === "GRAND_RESET");
    const grand = decided.find((m) => m.bracket === "GRAND_FINAL");
    return reset ?? grand ?? null;
  }
  const wb = decided.filter((m) => m.bracket === "WINNERS");
  if (wb.length === 0) return null;
  return wb.reduce((acc, m) => (m.round > acc.round ? m : acc));
}

// ---------------------------------------------------------------
// MVP voting
// ---------------------------------------------------------------

export type MvpTallyEntry = {
  candidateUserId: string;
  votes: number;
};

/**
 * Tally current MVP votes for a league. Sorted by votes desc.
 * Plain `findMany` + in-memory grouping keeps types simple and is fine
 * at LADDER-scale (a league has at most ~64 voters).
 */
export async function tallyMvpVotes(
  leagueId: string,
): Promise<MvpTallyEntry[]> {
  const votes = await prisma.leagueMVPVote.findMany({
    where: { leagueId },
    select: { candidateUserId: true },
  });
  const counts = new Map<string, number>();
  for (const v of votes) {
    counts.set(v.candidateUserId, (counts.get(v.candidateUserId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([candidateUserId, count]) => ({ candidateUserId, votes: count }))
    .sort((a, b) => b.votes - a.votes);
}

/**
 * Whether MVP voting is currently closed for the league.
 *
 * Closed when:
 *   - the MVP award already exists (finalized), OR
 *   - the voting window has elapsed since `completedAt`.
 *
 * The "every captain voted" auto-close is enforced inside
 * `maybeFinalizeMvp` (not here) since this helper doesn't have the
 * captain count handy. Front-end gating uses this; finalization logic
 * uses both signals.
 */
export function isMvpVotingClosed(args: {
  completedAt: Date | null;
  hasMvpAward: boolean;
}): boolean {
  if (args.hasMvpAward) return true;
  if (!args.completedAt) return false;
  return Date.now() - args.completedAt.getTime() >= MVP_VOTING_WINDOW_MS;
}

/**
 * Lazy MVP finalization. Idempotent — does nothing if:
 *   - league isn't COMPLETED yet
 *   - MVP award already exists
 *   - voting hasn't closed (no quorum, no window expiry)
 *   - nobody voted, or top votes are tied
 *
 * Returns the (newly-created) award id, or null.
 *
 * Called from read paths (recap / league page / vote action) so the
 * award materializes the first time someone visits after voting closes.
 */
export async function maybeFinalizeMvp(
  leagueId: string,
): Promise<string | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      state: true,
      completedAt: true,
      teams: { select: { captainUserId: true } },
      awards: { where: { kind: "MVP" }, select: { id: true } },
    },
  });
  if (!league) return null;
  if (league.state !== "COMPLETED") return null;
  if (league.awards.length > 0) return null;

  const captainIds = new Set(league.teams.map((t) => t.captainUserId));
  const totalCaptains = captainIds.size;

  const tally = await tallyMvpVotes(leagueId);
  // Count distinct captain voters (organizer-only votes don't satisfy
  // the all-captains-voted quorum, but they do count toward the tally).
  const captainVoterCount = await prisma.leagueMVPVote.count({
    where: {
      leagueId,
      voterUserId: { in: [...captainIds] },
    },
  });
  const allCaptainsVoted =
    totalCaptains > 0 && captainVoterCount >= totalCaptains;

  const windowExpired = league.completedAt
    ? Date.now() - league.completedAt.getTime() >= MVP_VOTING_WINDOW_MS
    : false;

  if (!allCaptainsVoted && !windowExpired) return null;
  if (tally.length === 0) return null;
  // Tie at the top → skip. Organizers can revisit MVP rules in v2.1.
  if (tally.length > 1 && tally[0].votes === tally[1].votes) return null;

  const top = tally[0];
  const team = await prisma.team.findFirst({
    where: { leagueId, captainUserId: top.candidateUserId },
    select: { id: true },
  });

  const award = await prisma.leagueAward.upsert({
    where: { leagueId_kind: { leagueId, kind: "MVP" } },
    create: {
      leagueId,
      kind: "MVP",
      recipientUserId: top.candidateUserId,
      teamId: team?.id ?? null,
      voteCount: top.votes,
    },
    update: {
      recipientUserId: top.candidateUserId,
      teamId: team?.id ?? null,
      voteCount: top.votes,
    },
  });
  return award.id;
}

/**
 * Whether the given user is eligible to vote in the league's MVP poll.
 * Eligible: organizer OR captain of any team in the league.
 *
 * Does NOT check whether voting is open — combine with
 * `isMvpVotingClosed` at the call site.
 */
export async function canVoteMvp(
  leagueId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      organizerId: true,
      teams: { where: { captainUserId: userId }, select: { id: true } },
    },
  });
  if (!league) return false;
  if (league.organizerId === userId) return true;
  return league.teams.length > 0;
}

/**
 * Whether the given user can be voted FOR. v2.0-F: any captain of a
 * team in this league. (Roster members aren't user-linked yet.)
 */
export async function isMvpCandidate(
  leagueId: string,
  candidateUserId: string,
): Promise<boolean> {
  const team = await prisma.team.findFirst({
    where: { leagueId, captainUserId: candidateUserId },
    select: { id: true },
  });
  return team !== null;
}

// ---------------------------------------------------------------
// Read-side helpers — hydrate the AwardsSection props in one shot.
// ---------------------------------------------------------------

export type AwardsSectionData = {
  awards: Array<{
    kind: "CHAMPION" | "RUNNER_UP" | "MVP";
    recipient: {
      id: string;
      displayName: string;
      handle: string | null;
      avatarUrl: string | null;
    };
    team: { id: string; name: string } | null;
    voteCount: number | null;
  }>;
  mvp: {
    canVote: boolean;
    closed: boolean;
    candidates: Array<{
      userId: string;
      displayName: string;
      handle: string | null;
      avatarUrl: string | null;
      teamName: string;
      votes: number;
    }>;
    viewerVote: string | null;
  };
  completedAt: Date | null;
};

/**
 * Hydrate the data the AwardsSection needs in one helper. Also runs
 * `maybeFinalizeMvp` opportunistically so the MVP award materializes
 * the first time a recap page is loaded after voting closes — no cron
 * required.
 *
 * Caller is responsible for only invoking this on COMPLETED leagues.
 */
export async function loadAwardsSectionData(
  leagueId: string,
  viewerId: string | null,
): Promise<AwardsSectionData> {
  // Try to finalize first — if voting just closed, the next read sees
  // the finalized MVP award and the section flips into "decided" mode.
  await maybeFinalizeMvp(leagueId);

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      organizerId: true,
      completedAt: true,
      awards: {
        select: {
          kind: true,
          voteCount: true,
          recipient: {
            select: {
              id: true,
              displayName: true,
              handle: true,
              avatarUrl: true,
            },
          },
          team: { select: { id: true, name: true } },
        },
      },
      teams: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          captainUserId: true,
          captain: {
            select: {
              id: true,
              displayName: true,
              handle: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
  if (!league) {
    return {
      awards: [],
      mvp: {
        canVote: false,
        closed: true,
        candidates: [],
        viewerVote: null,
      },
      completedAt: null,
    };
  }

  const tally = await tallyMvpVotes(leagueId);
  const tallyMap = new Map(tally.map((t) => [t.candidateUserId, t.votes]));

  const candidates = league.teams.map((t) => ({
    userId: t.captain.id,
    displayName: t.captain.displayName,
    handle: t.captain.handle,
    avatarUrl: t.captain.avatarUrl,
    teamName: t.name,
    votes: tallyMap.get(t.captain.id) ?? 0,
  }));

  const hasMvpAward = league.awards.some((a) => a.kind === "MVP");
  const closed = isMvpVotingClosed({
    completedAt: league.completedAt,
    hasMvpAward,
  });

  let canVote = false;
  let viewerVote: string | null = null;
  if (viewerId && !closed) {
    const isOrganizer = league.organizerId === viewerId;
    const isCaptain = league.teams.some(
      (t) => t.captainUserId === viewerId,
    );
    canVote = isOrganizer || isCaptain;

    if (canVote) {
      const myVote = await prisma.leagueMVPVote.findUnique({
        where: {
          leagueId_voterUserId: { leagueId, voterUserId: viewerId },
        },
        select: { candidateUserId: true },
      });
      viewerVote = myVote?.candidateUserId ?? null;
    }
  }

  return {
    awards: league.awards.map((a) => ({
      kind: a.kind,
      recipient: a.recipient,
      team: a.team,
      voteCount: a.voteCount,
    })),
    mvp: { canVote, closed, candidates, viewerVote },
    completedAt: league.completedAt,
  };
}
