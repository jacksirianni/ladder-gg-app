import type { MatchBracket, MatchStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

type BracketNodeProps = {
  match: {
    // v2.0: which bracket the match lives in.
    bracket: MatchBracket;
    round: number;
    bracketPosition: number;
    teamAId: string | null;
    teamBId: string | null;
    winnerTeamId: string | null;
    status: MatchStatus;
    // v1.7: structured per-team scores (set on confirm).
    teamAScore: number | null;
    teamBScore: number | null;
    teamA: { id: string; name: string } | null;
    teamB: { id: string; name: string } | null;
    reports: {
      reportedWinnerTeamId: string;
      scoreText: string | null;
      reportedTeamAScore: number | null;
      reportedTeamBScore: number | null;
    }[];
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
  score,
}: {
  team: { name: string } | null;
  isWinner: boolean;
  /** Per-team numeric score for BO-N / SINGLE_SCORE. Null otherwise. */
  score: number | null;
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
      {score !== null && (
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            isWinner ? "font-semibold text-success" : "text-foreground-muted",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

export function BracketNode({ match }: BracketNodeProps) {
  const winner = match.winnerTeamId;
  // v1.7: prefer structured per-team scores from the match itself
  // (set on confirm/organizer decision) → fall back to the latest
  // report's structured score → null.
  const latestReport = match.reports[0] ?? null;
  const teamAScore =
    match.teamAScore !== null
      ? match.teamAScore
      : latestReport?.reportedTeamAScore ?? null;
  const teamBScore =
    match.teamBScore !== null
      ? match.teamBScore
      : latestReport?.reportedTeamBScore ?? null;

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
        score={teamAScore}
      />
      <div className="border-t border-border" />
      <TeamRow
        team={match.teamB}
        isWinner={!!winner && winner === match.teamBId}
        score={teamBScore}
      />
    </div>
  );
}
