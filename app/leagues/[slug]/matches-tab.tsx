"use client";

import { useState } from "react";
import type { MatchFormat, MatchStatus } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchRow } from "@/components/match-row";
import { MatchActionModal } from "@/components/match-action-modal";

export type MatchForTab = {
  id: string;
  round: number;
  bracketPosition: number;
  status: MatchStatus;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  // v1.7: structured scores
  teamAScore: number | null;
  teamBScore: number | null;
  confirmedAt: string | null;
  disputedAt: string | null;
  teamA: { id: string; name: string; captainUserId: string } | null;
  teamB: { id: string; name: string; captainUserId: string } | null;
  resolvedBy: { displayName: string } | null;
  disputedBy: { displayName: string } | null;
  reports: {
    reportedByUserId: string;
    reportedWinnerTeamId: string;
    scoreText: string | null;
    reportedTeamAScore: number | null;
    reportedTeamBScore: number | null;
    createdAt: string;
    reportedBy: { displayName: string };
  }[];
};

type Props = {
  matches: MatchForTab[];
  viewerId: string | null;
  isOrganizer?: boolean;
  /** v1.7: League.matchFormat — drives match modal score inputs. */
  matchFormat: MatchFormat;
  /** v1.9: optional override for the final match. */
  finalMatchFormat?: MatchFormat | null;
  /** Match id to open on mount (from `?match=` deep link). Server has
   * already validated that the id exists in this league. */
  initialMatchId?: string | null;
};

export function MatchesTab({
  matches,
  viewerId,
  isOrganizer = false,
  matchFormat,
  finalMatchFormat = null,
  initialMatchId = null,
}: Props) {
  const [openMatchId, setOpenMatchId] = useState<string | null>(initialMatchId);
  const openMatch = matches.find((m) => m.id === openMatchId) ?? null;

  // v1.9: highest round in the bracket — needed so the modal knows
  // which format applies to the open match (default vs final-only).
  const totalRounds = matches.reduce(
    (acc, m) => (m.round > acc ? m.round : acc),
    0,
  );

  if (matches.length === 0) {
    return (
      <EmptyState
        title="Bracket hasn't started"
        description="Matches will appear here once the organizer kicks things off."
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {matches.map((m) => (
          <li key={m.id}>
            <MatchRow
              match={m}
              viewerId={viewerId}
              onOpen={() => setOpenMatchId(m.id)}
            />
          </li>
        ))}
      </ul>
      <MatchActionModal
        match={openMatch}
        viewerId={viewerId}
        isOrganizer={isOrganizer}
        matchFormat={matchFormat}
        finalMatchFormat={finalMatchFormat}
        totalRounds={totalRounds}
        onClose={() => setOpenMatchId(null)}
      />
    </>
  );
}
