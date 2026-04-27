"use client";

import { useActionState, useEffect } from "react";
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
  teamA: { id: string; name: string; captainUserId: string } | null;
  teamB: { id: string; name: string; captainUserId: string } | null;
  reports: {
    reportedByUserId: string;
    reportedWinnerTeamId: string;
    scoreText: string | null;
  }[];
};

type Props = {
  match: Match | null;
  viewerId: string | null;
  onClose: () => void;
};

const initialState: MatchActionState = {};

export function MatchActionModal({ match, viewerId, onClose }: Props) {
  const open = match !== null;

  // Hooks must run unconditionally — drive these by `open` instead of by `match`.
  const [reportState, reportAction, reportPending] = useActionState(
    submitMatchReportAction,
    initialState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmMatchAction,
    initialState,
  );

  // Close the modal once an action returns successfully (no error / no fieldErrors).
  useEffect(() => {
    if (!open) return;
    if (
      reportState &&
      !reportState.error &&
      !reportState.fieldErrors &&
      reportPending === false
    ) {
      // The action returned cleanly. We don't auto-close on initial empty state,
      // so we differentiate by checking if the action ever resolved during this open.
      // Simplest heuristic: do nothing; user can close manually after revalidation.
    }
  }, [open, reportState, reportPending]);

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
        <form action={confirmAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="matchId" value={match.id} />
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
          {confirmState.error && (
            <p className="text-sm text-destructive">{confirmState.error}</p>
          )}
          <p className="text-xs text-foreground-subtle">
            Disputes will be available in a future update. For now, only confirm
            if the result above is correct.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={confirmPending}>
              {confirmPending ? "Confirming…" : "Confirm result"}
            </Button>
          </div>
        </form>
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

      {(match.status === "CONFIRMED" ||
        match.status === "ORGANIZER_DECIDED") && (
        <div className="mt-6 text-sm">
          <p className="font-medium text-success">
            {reportedWinnerName ?? (match.winnerTeamId === match.teamA?.id ? teamAName : teamBName)} won
            {latestReport?.scoreText && (
              <>
                {" "}
                <span className="font-mono">({latestReport.scoreText})</span>
              </>
            )}
            .
          </p>
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
