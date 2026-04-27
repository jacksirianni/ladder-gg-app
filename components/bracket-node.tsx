import type { MatchStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

type BracketNodeProps = {
  match: {
    round: number;
    bracketPosition: number;
    teamAId: string | null;
    teamBId: string | null;
    winnerTeamId: string | null;
    status: MatchStatus;
    teamA: { id: string; name: string } | null;
    teamB: { id: string; name: string } | null;
    reports: { reportedWinnerTeamId: string; scoreText: string | null }[];
  };
};

const statusBorder: Partial<Record<MatchStatus, string>> = {
  AWAITING_CONFIRM: "border-warning/40",
  DISPUTED: "border-destructive/40",
  CONFIRMED: "border-success/40",
  ORGANIZER_DECIDED: "border-primary/40",
};

function TeamRow({
  team,
  isWinner,
  scoreText,
}: {
  team: { name: string } | null;
  isWinner: boolean;
  scoreText?: string | null;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 text-sm",
        isWinner && "bg-success/10 text-success",
      )}
    >
      <span className="min-w-0 truncate">
        {team ? team.name : "TBD"}
      </span>
      {scoreText && (
        <span className="font-mono text-xs text-foreground-subtle">
          {scoreText}
        </span>
      )}
    </div>
  );
}

export function BracketNode({ match }: BracketNodeProps) {
  const winner = match.winnerTeamId;
  const score = match.reports[0]?.scoreText ?? null;

  return (
    <div
      className={cn(
        "min-w-44 overflow-hidden rounded-md border bg-surface text-foreground",
        statusBorder[match.status] ?? "border-border",
      )}
    >
      <TeamRow
        team={match.teamA}
        isWinner={!!winner && winner === match.teamAId}
        scoreText={
          winner && winner === match.teamAId ? score : undefined
        }
      />
      <div className="border-t border-border" />
      <TeamRow
        team={match.teamB}
        isWinner={!!winner && winner === match.teamBId}
        scoreText={
          winner && winner === match.teamBId ? score : undefined
        }
      />
    </div>
  );
}
