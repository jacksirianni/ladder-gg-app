"use client";

import { useActionState, useState } from "react";
import type {
  MatchBracket,
  MatchFormat,
  MatchStatus,
} from "@prisma/client";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EvidencePanel } from "@/components/evidence-panel";
import {
  confirmMatchAction,
  disputeMatchAction,
  submitMatchReportAction,
  type MatchActionState,
} from "@/app/leagues/[slug]/actions";
import { overrideMatchAction } from "@/app/leagues/[slug]/manage/actions";
import {
  FORMAT_RULES,
  formatForMatch,
  formatScorePair,
} from "@/lib/match-format";
import { formatRelativeTime } from "@/lib/relative-time";

type Match = {
  id: string;
  // v2.0: which bracket (DE: WINNERS / LOSERS / GRAND_FINAL / GRAND_RESET).
  bracket: MatchBracket;
  round: number;
  bracketPosition: number;
  status: MatchStatus;
  teamAId: string | null;
  teamBId: string | null;
  winnerTeamId: string | null;
  // v1.7: structured scores (interpretation depends on League.matchFormat)
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
  match: Match | null;
  viewerId: string | null;
  /** v1.3: lets the modal show organizer-only override controls. */
  isOrganizer?: boolean;
  /** v1.7: League.matchFormat — drives report-modal score inputs.
   *  v1.9: this is the *default* format; the final match may override
   *  via `finalMatchFormat`. */
  matchFormat: MatchFormat;
  /** v1.9: League.finalMatchFormat — applies only to the highest-round
   *  match in the bracket. */
  finalMatchFormat?: MatchFormat | null;
  /** v1.9: highest round in the bracket. Used with the open match's
   *  round to decide whether the final-format override applies. */
  totalRounds?: number;
  onClose: () => void;
};

const initialState: MatchActionState = {};

// v1.4: friendlier "X minutes ago" style; falls back to short date past 7 days.
function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  return formatRelativeTime(iso);
}

export function MatchActionModal({
  match,
  viewerId,
  isOrganizer = false,
  matchFormat,
  finalMatchFormat = null,
  totalRounds = 0,
  onClose,
}: Props) {
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

  // v1.3: lets the original reporter switch into edit mode while AWAITING_CONFIRM.
  const [editingReport, setEditingReport] = useState(false);
  // v1.3: lets the organizer reveal the override control on resolved matches.
  const [overrideOpen, setOverrideOpen] = useState(false);
  // v1.7: lets the disputing captain expand the dispute panel to attach
  // evidence before submitting.
  const [disputeOpen, setDisputeOpen] = useState(false);

  if (!match) {
    return (
      <Dialog open={false} onClose={onClose}>
        <DialogTitle>Match</DialogTitle>
      </Dialog>
    );
  }

  // v1.9: figure out which format applies to *this* match. The final
  // gets the override (if set); everything else uses the default.
  // v2.0: in DE, GF and GR also count as "the final" for the format
  // override.
  const isWinnersFinal =
    match.bracket === "WINNERS" &&
    totalRounds > 0 &&
    match.round === totalRounds;
  const isGrandFinal =
    match.bracket === "GRAND_FINAL" || match.bracket === "GRAND_RESET";
  const isFinal = isWinnersFinal || isGrandFinal;
  const effectiveFormat = formatForMatch({
    matchRound: match.round,
    totalRounds,
    matchFormat,
    finalMatchFormat: isGrandFinal ? finalMatchFormat : finalMatchFormat,
  });
  const effectiveRules = FORMAT_RULES[effectiveFormat];

  // v2.0: bracket-aware title prefix.
  const bracketPrefix =
    match.bracket === "GRAND_FINAL"
      ? "Grand final"
      : match.bracket === "GRAND_RESET"
        ? "Grand final reset"
        : match.bracket === "LOSERS"
          ? `Losers R${match.round}`
          : isWinnersFinal
            ? "Final"
            : `Round ${match.round}`;

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

  const showResolved =
    match.status === "CONFIRMED" || match.status === "ORGANIZER_DECIDED";
  const showOverride = isOrganizer && showResolved;

  return (
    <Dialog
      open={open}
      onClose={() => {
        setEditingReport(false);
        setOverrideOpen(false);
        setDisputeOpen(false);
        onClose();
      }}
    >
      <DialogTitle>
        {bracketPrefix}
        {match.bracket !== "GRAND_FINAL" &&
          match.bracket !== "GRAND_RESET" && (
            <>
              {" "}
              · Match {match.bracketPosition}
            </>
          )}
      </DialogTitle>
      <DialogDescription>
        <span className="font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
          {effectiveRules.label}
          {isFinal && finalMatchFormat && finalMatchFormat !== matchFormat && (
            <span className="ml-2 rounded-sm border border-success/40 bg-success/10 px-1.5 py-0.5 text-success">
              Final-only format
            </span>
          )}
        </span>
        <span className="block text-foreground-muted">
          {teamAName} vs {teamBName}
        </span>
      </DialogDescription>

      {match.status === "PENDING" && (
        <div className="mt-6 text-sm text-foreground-muted">
          Waiting for upstream matches to complete before this one can be
          played.
        </div>
      )}

      {match.status === "AWAITING_REPORT" && isCaptainInMatch && (
        <ReportForm
          match={match}
          matchFormat={effectiveFormat}
          reportState={reportState}
          reportAction={reportAction}
          reportPending={reportPending}
          submitLabel="Submit result"
          pendingLabel="Submitting…"
          defaults={null}
          onCancel={onClose}
        />
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
              {(() => {
                // v1.7: prefer structured score; fall back to scoreText.
                const structured = formatScorePair(
                  latestReport?.reportedTeamAScore,
                  latestReport?.reportedTeamBScore,
                );
                if (structured) {
                  return (
                    <>
                      {" "}
                      <span className="font-mono">({structured})</span>
                    </>
                  );
                }
                if (latestReport?.scoreText) {
                  return (
                    <>
                      {" "}
                      <span className="font-mono">({latestReport.scoreText})</span>
                    </>
                  );
                }
                return null;
              })()}
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
          {/* v1.7: dispute affordance now supports evidence attachment.
              Collapsed → "Dispute" button shows + Confirm button.
              Expanded → evidence panel + Submit dispute. */}
          {!disputeOpen ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDisputeOpen(true)}
                className="w-full sm:w-auto"
              >
                Dispute…
              </Button>
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
          ) : (
            <form
              action={disputeAction}
              className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3"
            >
              <input type="hidden" name="matchId" value={match.id} />
              <p className="text-xs text-foreground-muted">
                Add anything that supports your side — replay codes,
                screenshots, VOD timestamps. The organizer will see all
                evidence when resolving.
              </p>
              <EvidencePanel
                description="Optional. Attach what backs up your version of the result."
                compact
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDisputeOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={disputePending}
                  className="w-full sm:w-auto"
                >
                  {disputePending ? "Submitting…" : "Submit dispute"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {match.status === "AWAITING_CONFIRM" && isReporter && !editingReport && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="text-sm text-foreground-muted">
            You reported{" "}
            <span className="text-foreground">
              {reportedWinnerName ?? "?"}
            </span>{" "}
            as the winner
            {latestReport?.scoreText && (
              <>
                {" "}
                <span className="font-mono">({latestReport.scoreText})</span>
              </>
            )}
            . Awaiting confirmation from the opposing captain.
          </div>
          <div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setEditingReport(true)}
            >
              Edit report
            </Button>
            <span className="ml-2 text-xs text-foreground-subtle">
              Fix a typo before your opponent confirms.
            </span>
          </div>
        </div>
      )}

      {match.status === "AWAITING_CONFIRM" && isReporter && editingReport && (
        <ReportForm
          match={match}
          matchFormat={effectiveFormat}
          reportState={reportState}
          reportAction={reportAction}
          reportPending={reportPending}
          submitLabel="Update report"
          pendingLabel="Updating…"
          defaults={{
            winnerTeamId: latestReport?.reportedWinnerTeamId ?? "",
            scoreText: latestReport?.scoreText ?? "",
            teamAScore: latestReport?.reportedTeamAScore ?? null,
            teamBScore: latestReport?.reportedTeamBScore ?? null,
          }}
          onCancel={() => setEditingReport(false)}
        />
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

      {showResolved && (
        <div className="mt-6 text-sm">
          <p className="font-medium text-success">
            {finalWinnerName ?? reportedWinnerName ?? "?"} won
            {(() => {
              // v1.7: prefer the match's structured score, fall back to
              // the latest report's structured score, then scoreText.
              const matchScore = formatScorePair(
                match.teamAScore,
                match.teamBScore,
              );
              const reportScore = formatScorePair(
                latestReport?.reportedTeamAScore,
                latestReport?.reportedTeamBScore,
              );
              const score =
                matchScore ?? reportScore ?? latestReport?.scoreText ?? null;
              return score ? (
                <>
                  {" "}
                  <span className="font-mono">({score})</span>
                </>
              ) : null;
            })()}
            {match.status === "ORGANIZER_DECIDED" && (
              <span className="ml-2 font-normal text-foreground-subtle">
                (resolved by organizer)
              </span>
            )}
            .
          </p>
        </div>
      )}

      {/* Activity log */}
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

      {/* v1.3: organizer override on resolved matches */}
      {showOverride && (
        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          {overrideOpen ? (
            <>
              <p className="font-medium text-destructive">Override result</p>
              <p className="mt-1 text-xs text-foreground-muted">
                Set a different winner. Allowed only when the next match
                hasn&apos;t been reported yet. The downstream slot will be
                updated.
              </p>
              <form action={overrideMatchAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="matchId" value={match.id} />
                <Select
                  name="winnerTeamId"
                  required
                  defaultValue={match.winnerTeamId ?? ""}
                  aria-label="New winner"
                  className="w-auto"
                >
                  {match.teamA && (
                    <option value={match.teamA.id}>{match.teamA.name}</option>
                  )}
                  {match.teamB && (
                    <option value={match.teamB.id}>{match.teamB.name}</option>
                  )}
                </Select>
                <Button type="submit" size="sm" variant="destructive">
                  Override result
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setOverrideOpen(false)}
                >
                  Cancel
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-foreground-muted">
                Need to fix this result? Organizer can override.
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setOverrideOpen(true)}
              >
                Override result
              </Button>
            </div>
          )}
        </div>
      )}

      {match.status !== "AWAITING_REPORT" &&
        !(match.status === "AWAITING_CONFIRM" && isReporter && editingReport) &&
        match.status !== "AWAITING_CONFIRM" && (
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingReport(false);
                setOverrideOpen(false);
                setDisputeOpen(false);
                onClose();
              }}
            >
              Close
            </Button>
          </div>
        )}
    </Dialog>
  );
}

function ReportForm({
  match,
  matchFormat,
  reportState,
  reportAction,
  reportPending,
  submitLabel,
  pendingLabel,
  defaults,
  onCancel,
}: {
  match: Match;
  matchFormat: MatchFormat;
  reportState: MatchActionState;
  reportAction: (formData: FormData) => void;
  reportPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  defaults: {
    winnerTeamId: string;
    scoreText: string;
    teamAScore: number | null;
    teamBScore: number | null;
  } | null;
  onCancel: () => void;
}) {
  const rules = FORMAT_RULES[matchFormat];
  const isBoN =
    matchFormat === "BEST_OF_3" ||
    matchFormat === "BEST_OF_5" ||
    matchFormat === "BEST_OF_7";
  const showStructuredScore = isBoN || matchFormat === "SINGLE_SCORE";
  const showFreeformScore = matchFormat === "FREEFORM";

  return (
    <form action={reportAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="matchId" value={match.id} />

      <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
        Format: {rules.label}
        {isBoN && rules.winsRequired !== null && (
          <> · first to {rules.winsRequired} wins</>
        )}
      </p>

      <FormField
        label="Winner"
        htmlFor="winnerTeamId"
        hint={
          isBoN
            ? "We'll cross-check against the score below."
            : undefined
        }
        error={reportState.fieldErrors?.winnerTeamId}
      >
        <Select
          id="winnerTeamId"
          name="winnerTeamId"
          required
          defaultValue={defaults?.winnerTeamId ?? ""}
        >
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

      {showStructuredScore && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={`${match.teamA?.name ?? "Team A"} ${isBoN ? "wins" : "score"}`}
            htmlFor="reportedTeamAScore"
            error={reportState.fieldErrors?.reportedTeamAScore}
          >
            <Input
              id="reportedTeamAScore"
              name="reportedTeamAScore"
              type="number"
              min={0}
              max={isBoN ? rules.winsRequired ?? undefined : 99}
              required={isBoN}
              defaultValue={defaults?.teamAScore ?? ""}
            />
          </FormField>
          <FormField
            label={`${match.teamB?.name ?? "Team B"} ${isBoN ? "wins" : "score"}`}
            htmlFor="reportedTeamBScore"
            error={reportState.fieldErrors?.reportedTeamBScore}
          >
            <Input
              id="reportedTeamBScore"
              name="reportedTeamBScore"
              type="number"
              min={0}
              max={isBoN ? rules.winsRequired ?? undefined : 99}
              required={isBoN}
              defaultValue={defaults?.teamBScore ?? ""}
            />
          </FormField>
          {reportState.fieldErrors?.score && (
            <p className="text-sm text-destructive sm:col-span-2">
              {reportState.fieldErrors.score}
            </p>
          )}
        </div>
      )}

      {showFreeformScore && (
        <FormField
          label="Score"
          htmlFor="scoreText"
          hint='Optional. Free-form, e.g. "127 to 119 to 102 to 89".'
          error={reportState.fieldErrors?.scoreText}
        >
          <Input
            id="scoreText"
            name="scoreText"
            maxLength={30}
            placeholder="Free-form score"
            defaultValue={defaults?.scoreText ?? ""}
          />
        </FormField>
      )}

      {/* Optional scoreText for BO-N / SINGLE_SCORE — captures detail
          like "3-1 (close OT)" alongside the structured score. */}
      {!showFreeformScore && (
        <FormField
          label="Score notes"
          htmlFor="scoreText"
          hint="Optional free-form note, e.g. close OT, forfeit on G3."
          error={reportState.fieldErrors?.scoreText}
        >
          <Input
            id="scoreText"
            name="scoreText"
            maxLength={30}
            placeholder=""
            defaultValue={defaults?.scoreText ?? ""}
          />
        </FormField>
      )}

      {/* v1.7: evidence attachment. Optional, up to 6 rows. */}
      <EvidencePanel
        description="Replay codes, scoreboard screenshots, VOD links, Tracker URLs — all optional."
      />

      {reportState.error && (
        <p className="text-sm text-destructive">{reportState.error}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={reportPending}>
          {reportPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
