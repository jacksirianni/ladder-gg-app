"use client";

import { useActionState } from "react";
import type { MatchStatus } from "@prisma/client";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  confirmMatchAction,
  disputeMatchAction,
  submitMatchReportAction,
  type MatchActionState,
} from "@/app/leagues/[slug]/actions";

type Match = {
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
  match: Match | null;
  viewerId: string | null;
  onClose: () => void;
};

const initialState: MatchActionState = {};

function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MatchActionModal({ match, viewerId, onClose }: Props) {
  const open = match !== null;

  const [reportState, reportAction, reportPending] = useActionState(
    submitMatchReportAction,
    initialState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmMatchAction,
    initialState,
  );
  const [disputeState, disputeAction, disputePending] = useActionState(
    disputeMatchAction,
    initialState,
  );

  if (!match) {
    return (
      <Dialog open={false} onClose={onClose}>
        <DialogTitle>Match</DialogTitle>
      </Dialog>
    );
  }

  const isCaptainInMatch =
    !!viewerId &&
    (viewerId === match.teamA?.captainUserId ||
      viewerId === match.teamB?.captainUserId);

  const latestReport = match.reports[0] ?? null;
  const isReporter = !!viewerId && viewerId === latestReport?.reportedByUserId;

  const teamAName = match.teamA?.name ?? "TBD";
  const teamBName = match.teamB?.name ?? "TBD";

  const reportedWinnerName =
    latestReport?.reportedWinnerTeamId === match.teamA?.id
      ? teamAName
      : latestReport?.reportedWinnerTeamId === match.teamB?.id
        ? teamBName
        : null;

  const finalWinnerName =
    match.winnerTeamId === match.teamA?.id
      ? teamAName
      : match.winnerTeamId === match.teamB?.id
        ? teamBName
        : null;

  // v1.1 activity log entries
  const activity: { label: string }[] = [];
  if (latestReport) {
    activity.push({
      label: `Reported by ${latestReport.reportedBy.displayName} · ${formatTimestamp(latestReport.createdAt)}`,
    });
  }
  if (match.disputedAt && match.disputedBy) {
    activity.push({
      label: `Disputed by ${match.disputedBy.displayName} · ${formatTimestamp(match.disputedAt)}`,
    });
  }
  if (
    match.confirmedAt &&
    match.resolvedBy &&
    match.status === "CONFIRMED"
  ) {
    activity.push({
      label: `Confirmed by ${match.resolvedBy.displayName} · ${formatTimestamp(match.confirmedAt)}`,
    });
  }
  if (
    match.confirmedAt &&
    match.resolvedBy &&
    match.status === "ORGANIZER_DECIDED"
  ) {
    activity.push({
      label: `Resolved by organizer ${match.resolvedBy.displayName} · ${formatTimestamp(match.confirmedAt)}`,
    });
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Round {match.round} · Match {match.bracketPosition}
      </DialogTitle>
      <DialogDescription>
        {teamAName} vs {teamBName}
      </DialogDescription>

      {match.status === "PENDING" && (
        <div className="mt-6 text-sm text-foreground-muted">
          Waiting for upstream matches to complete before this one can be
          played.
        </div>
      )}

      {match.status === "AWAITING_REPORT" && isCaptainInMatch && (
        <form action={reportAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="matchId" value={match.id} />
          <FormField
            label="Winner"
            htmlFor="winnerTeamId"
            error={reportState.fieldErrors?.winnerTeamId}
          >
            <Select id="winnerTeamId" name="winnerTeamId" required defaultValue="">
              <option value="" disabled>
                Choose a winner
              </option>
              {match.teamA && (
                <option value={match.teamA.id}>{match.teamA.name}</option>
              )}
              {match.teamB && (
                <option value={match.teamB.id}>{match.teamB.name}</option>
              )}
            </Select>
          </FormField>
          <FormField
            label="Score"
            htmlFor="scoreText"
            hint='Optional. Free-form, e.g. "3-1".'
            error={reportState.fieldErrors?.scoreText}
          >
            <Input
              id="scoreText"
              name="scoreText"
              maxLength={30}
              placeholder="3-1"
            />
          </FormField>
          {reportState.error && (
            <p className="text-sm text-destructive">{reportState.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={reportPending}>
              {reportPending ? "Submitting…" : "Submit result"}
            </Button>
          </div>
        </form>
      )}

      {match.status === "AWAITING_REPORT" && !isCaptainInMatch && (
        <div className="mt-6 text-sm text-foreground-muted">
          Match is awaiting a result from one of the captains.
        </div>
      )}

      {match.status === "AWAITING_CONFIRM" && isCaptainInMatch && !isReporter && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
            <p className="font-medium">Reported result</p>
            <p className="mt-1 text-foreground-muted">
              <span className="text-foreground">{reportedWinnerName ?? "?"}</span>{" "}
              won
              {latestReport?.scoreText && (
                <>
                  {" "}
                  <span className="font-mono">({latestReport.scoreText})</span>
                </>
              )}
              .
            </p>
          </div>
          {(confirmState.error || disputeState.error) && (
            <p className="text-sm text-destructive">
              {confirmState.error ?? disputeState.error}
            </p>
          )}
          <p className="text-xs text-foreground-subtle">
            Dispute only if the result above is wrong. The organizer will
            decide the winner.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <form action={disputeAction}>
              <input type="hidden" name="matchId" value={match.id} />
              <Button
                type="submit"
                variant="destructive"
                disabled={disputePending}
                className="w-full sm:w-auto"
              >
                {disputePending ? "Disputing…" : "Dispute"}
              </Button>
            </form>
            <form action={confirmAction}>
              <input type="hidden" name="matchId" value={match.id} />
              <Button
                type="submit"
                disabled={confirmPending}
                className="w-full sm:w-auto"
              >
                {confirmPending ? "Confirming…" : "Confirm result"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {match.status === "AWAITING_CONFIRM" && isReporter && (
        <div className="mt-6 text-sm text-foreground-muted">
          You reported{" "}
          <span className="text-foreground">{reportedWinnerName ?? "?"}</span> as
          the winner
          {latestReport?.scoreText && (
            <>
              {" "}
              <span className="font-mono">({latestReport.scoreText})</span>
            </>
          )}
          . Awaiting confirmation from the opposing captain.
        </div>
      )}

      {match.status === "AWAITING_CONFIRM" && !isCaptainInMatch && (
        <div className="mt-6 text-sm text-foreground-muted">
          Result reported. Awaiting confirmation from the opposing captain.
        </div>
      )}

      {match.status === "DISPUTED" && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="rounded-md border border-warning/40 bg-warning/5 px-4 py-3 text-sm">
            <p className="font-medium text-warning">Disputed</p>
            <p className="mt-1 text-foreground-muted">
              The reported result is contested. The organizer will declare a
              winner.
            </p>
          </div>
          {latestReport && reportedWinnerName && (
            <p className="text-sm text-foreground-muted">
              Report on file:{" "}
              <span className="text-foreground">{reportedWinnerName}</span> won
              {latestReport.scoreText && (
                <>
                  {" "}
                  <span className="font-mono">({latestReport.scoreText})</span>
                </>
              )}
              .
            </p>
          )}
        </div>
      )}

      {(match.status === "CONFIRMED" ||
        match.status === "ORGANIZER_DECIDED") && (
        <div className="mt-6 text-sm">
          <p className="font-medium text-success">
            {finalWinnerName ?? reportedWinnerName ?? "?"} won
            {latestReport?.scoreText && match.status === "CONFIRMED" && (
              <>
                {" "}
                <span className="font-mono">({latestReport.scoreText})</span>
              </>
            )}
            {match.status === "ORGANIZER_DECIDED" && (
              <span className="ml-2 font-normal text-foreground-subtle">
                (resolved by organizer)
              </span>
            )}
            .
          </p>
        </div>
      )}

      {/* v1.1: activity log */}
      {activity.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
            Activity
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-xs text-foreground-muted">
            {activity.map((a, i) => (
              <li key={i}>{a.label}</li>
            ))}
          </ul>
        </div>
      )}

      {match.status !== "AWAITING_REPORT" && match.status !== "AWAITING_CONFIRM" && (
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Dialog>
  );
}
