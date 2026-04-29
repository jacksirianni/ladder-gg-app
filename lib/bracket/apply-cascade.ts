import type {
  LeagueFormat,
  MatchBracket,
  Prisma,
} from "@prisma/client";
import { emitChampionshipAwards } from "@/lib/awards";
import { notifyLeagueCompleted } from "@/lib/email/notify";
import {
  isDoubleElim,
  lbWonGrandFinal,
  nextSlotForLoser,
  nextSlotForWinner,
  winnersRoundCount,
  type NextSlot,
} from "./cascade";

type TxLike = Prisma.TransactionClient;

/**
 * v2.0: shared cascade applier for confirm / resolveDispute / override
 * actions. Encapsulates "after a match is decided, where do the winner
 * and loser go next?" so the format-aware logic lives in one place.
 *
 * Single-elim: only the winner cascades (existing behavior). Loser is
 * eliminated.
 * Double-elim: winner and loser BOTH cascade (loser drops to LB unless
 * already in LB, in which case eliminated).
 *
 * Returns whether the league should now be marked COMPLETED.
 */
export async function applyMatchCascade(
  tx: TxLike,
  args: {
    leagueId: string;
    leagueFormat: LeagueFormat;
    allowBracketReset: boolean;
    bracketSize: number;
    /** The match that was just decided. */
    match: {
      id: string;
      bracket: MatchBracket;
      round: number;
      bracketPosition: number;
      teamAId: string | null;
      teamBId: string | null;
      winnerTeamId: string;
    };
  },
): Promise<{ leagueCompleted: boolean }> {
  const {
    leagueId,
    leagueFormat,
    allowBracketReset,
    bracketSize,
    match,
  } = args;

  // Figure out the loser id for cascade (only used in DE).
  const loserId =
    match.winnerTeamId === match.teamAId
      ? match.teamBId
      : match.teamAId;

  // For SINGLE_ELIM: legacy behavior — winner advances, loser eliminated.
  if (!isDoubleElim(leagueFormat)) {
    return await cascadeSingleElim(tx, leagueId, match);
  }

  // For DOUBLE_ELIM: use the format-aware cascade helper.
  const lbWonGF =
    match.bracket === "GRAND_FINAL"
      ? lbWonGrandFinal({
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          winnerTeamId: match.winnerTeamId,
        })
      : false;

  // Where does the WINNER go next?
  const winnerNext = nextSlotForWinner({
    bracket: match.bracket,
    round: match.round,
    bracketPosition: match.bracketPosition,
    bracketSize,
    lbWinnerWonGrandFinal: lbWonGF,
    allowBracketReset,
  });

  // Where does the LOSER go next? (Only WB matches and the GF-with-reset
  // produce a non-null result here.)
  const loserNext = nextSlotForLoser({
    bracket: match.bracket,
    round: match.round,
    bracketPosition: match.bracketPosition,
    bracketSize,
    lbWinnerWonGrandFinal: lbWonGF,
    allowBracketReset,
  });

  // No more cascades — this match decided the championship.
  if (!winnerNext && !loserNext) {
    await markLeagueCompleted(tx, leagueId);
    return { leagueCompleted: true };
  }

  // Apply each cascade.
  if (winnerNext) {
    await fillSlot(tx, leagueId, winnerNext, match.winnerTeamId);
  }
  if (loserNext && loserId) {
    await fillSlot(tx, leagueId, loserNext, loserId);
  }

  return { leagueCompleted: false };
}

// ---------------------------------------------------------------
// Single-elim cascade — legacy behavior preserved verbatim.
// ---------------------------------------------------------------

async function cascadeSingleElim(
  tx: TxLike,
  leagueId: string,
  match: {
    round: number;
    bracketPosition: number;
    winnerTeamId: string;
  },
): Promise<{ leagueCompleted: boolean }> {
  const nextRound = match.round + 1;
  const nextPosition = Math.ceil(match.bracketPosition / 2);

  const nextMatch = await tx.match.findUnique({
    where: {
      leagueId_bracket_round_bracketPosition: {
        leagueId,
        bracket: "WINNERS",
        round: nextRound,
        bracketPosition: nextPosition,
      },
    },
  });

  if (!nextMatch) {
    await markLeagueCompleted(tx, leagueId);
    return { leagueCompleted: true };
  }

  const isTeamASlot = match.bracketPosition % 2 === 1;
  const updateData: {
    teamAId?: string;
    teamBId?: string;
    status?: "AWAITING_REPORT";
  } = {};
  if (isTeamASlot) updateData.teamAId = match.winnerTeamId;
  else updateData.teamBId = match.winnerTeamId;

  const futureTeamA = isTeamASlot ? match.winnerTeamId : nextMatch.teamAId;
  const futureTeamB = isTeamASlot ? nextMatch.teamBId : match.winnerTeamId;
  if (futureTeamA && futureTeamB) {
    updateData.status = "AWAITING_REPORT";
  }

  await tx.match.update({
    where: { id: nextMatch.id },
    data: updateData,
  });
  return { leagueCompleted: false };
}

// ---------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------

async function markLeagueCompleted(tx: TxLike, leagueId: string) {
  await tx.league.update({
    where: { id: leagueId },
    data: { state: "COMPLETED", completedAt: new Date() },
  });
  // v2.0-F: persist CHAMPION + RUNNER_UP awards inside the same
  // transaction. Idempotent upserts — re-resolving the final updates
  // them in place. MVP is finalized lazily later by `maybeFinalizeMvp`.
  await emitChampionshipAwards(tx, leagueId);
  // v2.0-B: fire-and-forget league-completed email burst.
  // Schedule outside the transaction (using void + setImmediate-equivalent
  // would be cleaner but we just call it — notify reads from prisma
  // separately and is best-effort, wrapped in try/catch internally).
  void notifyLeagueCompleted(leagueId);
}

/**
 * Fill the given slot in the next match. If both slots end up
 * populated, transition the next match to AWAITING_REPORT.
 *
 * Idempotent-ish: re-applying the same fill is a no-op but doesn't
 * downgrade an already-AWAITING_REPORT match.
 */
async function fillSlot(
  tx: TxLike,
  leagueId: string,
  next: NextSlot,
  teamId: string,
) {
  const nextMatch = await tx.match.findUnique({
    where: {
      leagueId_bracket_round_bracketPosition: {
        leagueId,
        bracket: next.bracket,
        round: next.round,
        bracketPosition: next.bracketPosition,
      },
    },
  });
  if (!nextMatch) {
    // Shouldn't happen for a properly-generated bracket — but if it
    // does (e.g. bracket reset slot was disabled), silently no-op.
    return;
  }

  const data: {
    teamAId?: string;
    teamBId?: string;
    status?: "AWAITING_REPORT";
  } = {};
  if (next.slot === "A") data.teamAId = teamId;
  else data.teamBId = teamId;

  const futureTeamA = next.slot === "A" ? teamId : nextMatch.teamAId;
  const futureTeamB = next.slot === "B" ? teamId : nextMatch.teamBId;
  if (futureTeamA && futureTeamB && nextMatch.status === "PENDING") {
    data.status = "AWAITING_REPORT";
  }

  await tx.match.update({
    where: { id: nextMatch.id },
    data,
  });
}

/**
 * Compute the "bracket size" used by cascade helpers. For DE this
 * equals the team count (we enforce power-of-2). For SE it's the
 * smallest power of 2 >= team count.
 */
export function computeBracketSize(
  teamCount: number,
  format: LeagueFormat,
): number {
  if (format === "DOUBLE_ELIM") return teamCount;
  return Math.pow(2, Math.ceil(Math.log2(teamCount)));
}

/**
 * Re-compute total winners-bracket rounds given league format + team count.
 * Useful on read paths (recap, profile, etc.) to know whether a match
 * was the WB final.
 */
export function bracketGeometry(
  teamCount: number,
  format: LeagueFormat,
): {
  bracketSize: number;
  nWB: number;
  nLB: number;
} {
  const bracketSize = computeBracketSize(teamCount, format);
  const nWB = winnersRoundCount(bracketSize);
  const nLB = format === "DOUBLE_ELIM" ? Math.max(0, 2 * nWB - 2) : 0;
  return { bracketSize, nWB, nLB };
}
