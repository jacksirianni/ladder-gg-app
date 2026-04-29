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
  /** Match id to open on mount (from `?match=` deep link). Server has
   * already validated that the id exists in this league. */
  initialMatchId?: string | null;
};

export function MatchesTab({
  matches,
  viewerId,
  isOrganizer = false,
  matchFormat,
  initialMatchId = null,
}: Props) {
  const [openMatchId, setOpenMatchId] = useState<string | null>(initialMatchId);
  const openMatch = matches.find((m) => m.id === openMatchId) ?? null;

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
        onClose={() => setOpenMatchId(null)}
      />
    </>
  );
}
