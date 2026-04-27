"use client";

import type { MatchStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type MatchRowProps = {
  match: {
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
  viewerId: string | null;
  onOpen: () => void;
};

const statusVariant: Record<
  MatchStatus,
  "neutral" | "info" | "warning" | "success" | "destructive" | "primary"
> = {
  PENDING: "neutral",
  AWAITING_REPORT: "info",
  AWAITING_CONFIRM: "warning",
  CONFIRMED: "success",
  DISPUTED: "destructive",
  ORGANIZER_DECIDED: "primary",
};

const statusLabel: Record<MatchStatus, string> = {
  PENDING: "Waiting",
  AWAITING_REPORT: "Awaiting result",
  AWAITING_CONFIRM: "Needs confirmation",
  CONFIRMED: "Final",
  DISPUTED: "Disputed",
  ORGANIZER_DECIDED: "Resolved",
};

export function MatchRow({ match, viewerId, onOpen }: MatchRowProps) {
  const teamAName = match.teamA?.name ?? "TBD";
  const teamBName = match.teamB?.name ?? "TBD";
  const winnerId = match.winnerTeamId;

  const latestReport = match.reports[0] ?? null;

  const isCaptainInMatch =
    !!viewerId &&
    (viewerId === match.teamA?.captainUserId ||
      viewerId === match.teamB?.captainUserId);

  let actionLabel: string | null = null;
  if (match.status === "AWAITING_REPORT" && isCaptainInMatch) {
    actionLabel = "Report result";
  } else if (
    match.status === "AWAITING_CONFIRM" &&
    isCaptainInMatch &&
    latestReport &&
    viewerId !== latestReport.reportedByUserId
  ) {
    actionLabel = "Confirm result";
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs text-foreground-subtle">
          R{match.round} · M{match.bracketPosition}
        </p>
        <p className="mt-1 text-sm">
          <span
            className={cn(
              winnerId && winnerId === match.teamAId
                ? "font-semibold text-success"
                : "",
            )}
          >
            {teamAName}
          </span>
          <span className="px-2 text-foreground-subtle">vs</span>
          <span
            className={cn(
              winnerId && winnerId === match.teamBId
                ? "font-semibold text-success"
                : "",
            )}
          >
            {teamBName}
          </span>
        </p>
        {latestReport?.scoreText && match.status !== "PENDING" && (
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            {latestReport.scoreText}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant[match.status]}>
          {statusLabel[match.status]}
        </Badge>
        {actionLabel ? (
          <Button size="sm" onClick={onOpen}>
            {actionLabel}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onOpen}>
            View
          </Button>
        )}
      </div>
    </div>
  );
}
