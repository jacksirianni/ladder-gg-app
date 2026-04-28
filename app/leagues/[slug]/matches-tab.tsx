"use client";

import { useState } from "react";
import type { MatchStatus } from "@prisma/client";
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
    createdAt: string;
    reportedBy: { displayName: string };
  }[];
};

type Props = {
  matches: MatchForTab[];
  viewerId: string | null;
  isOrganizer?: boolean;
};

export function MatchesTab({ matches, viewerId, isOrganizer = false }: Props) {
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
        isOrganizer={isOrganizer}
        onClose={() => setOpenMatchId(null)}
      />
    </>
  );
}
