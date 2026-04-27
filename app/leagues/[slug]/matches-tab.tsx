"use client";

import { useState } from "react";
import type { MatchStatus } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchRow } from "@/components/match-row";
import { MatchActionModal } from "@/components/match-action-modal";

type Match = {
  id: string;
  round: number;
  bracketPosition: number;
  status: MatchStatus;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  teamA: { id: string; name: string; captainUserId: string } | null;
  teamB: { id: string; name: string; captainUserId: string } | null;
  reports: {
    reportedByUserId: string;
    reportedWinnerTeamId: string;
    scoreText: string | null;
  }[];
};

type Props = {
  matches: Match[];
  viewerId: string | null;
};

export function MatchesTab({ matches, viewerId }: Props) {
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);
  const openMatch = matches.find((m) => m.id === openMatchId) ?? null;

  if (matches.length === 0) {
    return (
      <EmptyState
        title="No matches yet"
        description="Matches appear once the organizer starts the league."
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
        onClose={() => setOpenMatchId(null)}
      />
    </>
  );
}
