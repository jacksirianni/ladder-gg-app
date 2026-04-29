import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ProfileLink } from "@/components/profile-link";
import { castMvpVoteAction } from "@/app/leagues/[slug]/actions";
import { cn } from "@/lib/cn";
import { MVP_VOTING_WINDOW_MS } from "@/lib/awards";

/**
 * v2.0-F: awards block. Renders:
 *
 *   - CHAMPION (always — every completed league has one)
 *   - RUNNER_UP (when present)
 *   - MVP — three modes:
 *       (a) finalized award already written → static "MVP" pill
 *       (b) voting open + viewer eligible → button-per-captain form
 *       (c) voting open + viewer not eligible → read-only live tally
 *       (d) voting closed with no winner (tie / no votes) → muted note
 *
 * Designed as a server component — the only interactive bit is a
 * regular HTML form posting to a server action. No JS required to
 * cast a vote.
 */

export type AwardEntry = {
  kind: "CHAMPION" | "RUNNER_UP" | "MVP";
  recipient: {
    id: string;
    displayName: string;
    handle: string | null;
    avatarUrl: string | null;
  };
  team: { id: string; name: string } | null;
  voteCount: number | null;
};

export type MvpCandidate = {
  userId: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  teamName: string;
  votes: number;
};

type Props = {
  leagueId: string;
  completedAt: Date | null;
  awards: AwardEntry[];
  mvp: {
    /** Eligible voters can submit; everyone else sees read-only. */
    canVote: boolean;
    /** Voting closed (window expired OR award already written). */
    closed: boolean;
    /** All known candidates with current vote counts. */
    candidates: MvpCandidate[];
    /** The viewer's current vote, if any. */
    viewerVote: string | null;
  };
};

export function AwardsSection({
  leagueId,
  completedAt,
  awards,
  mvp,
}: Props) {
  const champion = awards.find((a) => a.kind === "CHAMPION") ?? null;
  const runnerUp = awards.find((a) => a.kind === "RUNNER_UP") ?? null;
  const mvpAward = awards.find((a) => a.kind === "MVP") ?? null;

  if (!champion && !runnerUp && mvp.candidates.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        Awards
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {champion && <AwardCard award={champion} accent />}
        {runnerUp && <AwardCard award={runnerUp} />}
        <MvpCard
          award={mvpAward}
          mvp={mvp}
          leagueId={leagueId}
          completedAt={completedAt}
        />
      </div>
    </section>
  );
}

function AwardCard({
  award,
  accent = false,
}: {
  award: AwardEntry;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-5",
        accent ? "border-success/40 bg-success/5" : "border-border",
      )}
    >
      <p
        className={cn(
          "font-mono text-[11px] uppercase tracking-widest",
          accent ? "text-success" : "text-foreground-subtle",
        )}
      >
        {labelFor(award.kind)}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar
          src={award.recipient.avatarUrl}
          name={award.recipient.displayName}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">
            <ProfileLink
              handle={award.recipient.handle}
              className={accent ? "text-success" : "text-foreground"}
            >
              {award.recipient.displayName}
            </ProfileLink>
          </p>
          {award.team && (
            <p className="truncate text-xs text-foreground-muted">
              {award.team.name}
            </p>
          )}
          {award.kind === "MVP" && award.voteCount !== null && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
              {award.voteCount} {award.voteCount === 1 ? "vote" : "votes"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MvpCard({
  award,
  mvp,
  leagueId,
  completedAt,
}: {
  award: AwardEntry | null;
  mvp: Props["mvp"];
  leagueId: string;
  completedAt: Date | null;
}) {
  // Mode (a): finalized award.
  if (award) {
    return <AwardCard award={award} />;
  }

  // No candidates means we can't even render the voting UI. (Edge case:
  // a completed league with zero teams — should never happen, but
  // we guard anyway.)
  if (mvp.candidates.length === 0) {
    return null;
  }

  // Mode (d): voting closed but no MVP awarded (tie at top, or no votes).
  if (mvp.closed) {
    const noVotes = mvp.candidates.every((c) => c.votes === 0);
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface/40 p-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
          MVP
        </p>
        <p className="mt-3 text-sm text-foreground-muted">
          {noVotes
            ? "Voting closed without any ballots cast."
            : "Voting closed in a tie — no MVP awarded."}
        </p>
      </div>
    );
  }

  // Modes (b) + (c): voting open. Show countdown + tally + (form if eligible).
  return (
    <div className="rounded-lg border border-border bg-surface p-5 md:col-span-1">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
          MVP — voting
        </p>
        <VotingCountdown completedAt={completedAt} />
      </div>

      {mvp.canVote ? (
        <form action={castMvpVoteAction} className="mt-3">
          <input type="hidden" name="leagueId" value={leagueId} />
          <ul className="flex flex-col gap-1.5">
            {mvp.candidates.map((c) => {
              const isCurrent = c.userId === mvp.viewerVote;
              return (
                <li key={c.userId}>
                  <button
                    type="submit"
                    name="candidateUserId"
                    value={c.userId}
                    aria-pressed={isCurrent}
                    className={cn(
                      "group flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isCurrent
                        ? "border-primary/60 bg-primary/10"
                        : "border-border bg-surface hover:border-zinc-600 hover:bg-surface-elevated",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar
                        src={c.avatarUrl}
                        name={c.displayName}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate">
                          {c.displayName}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-foreground-subtle">
                          {c.teamName}
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-[11px] uppercase tracking-wider",
                        isCurrent ? "text-primary" : "text-foreground-subtle",
                      )}
                    >
                      {c.votes} {c.votes === 1 ? "vote" : "votes"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-foreground-subtle">
            {mvp.viewerVote
              ? "Click a different player to change your vote."
              : "Pick a captain to award MVP."}
          </p>
        </form>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {mvp.candidates.map((c) => (
            <li
              key={c.userId}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Avatar src={c.avatarUrl} name={c.displayName} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate">{c.displayName}</span>
                  <span className="block truncate font-mono text-[10px] text-foreground-subtle">
                    {c.teamName}
                  </span>
                </span>
              </span>
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
                {c.votes} {c.votes === 1 ? "vote" : "votes"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!mvp.canVote && (
        <p className="mt-3 text-[11px] text-foreground-subtle">
          <Link
            href="/signin"
            className="text-foreground-muted hover:text-foreground"
          >
            Sign in
          </Link>{" "}
          as a captain or organizer to vote.
        </p>
      )}
    </div>
  );
}

function VotingCountdown({ completedAt }: { completedAt: Date | null }) {
  if (!completedAt) return null;
  const closesAt = new Date(completedAt.getTime() + MVP_VOTING_WINDOW_MS);
  const remainingMs = closesAt.getTime() - Date.now();
  if (remainingMs <= 0) return null;
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  let label: string;
  if (days >= 1) {
    label = `${days}d left`;
  } else if (hours >= 1) {
    label = `${hours}h left`;
  } else {
    label = "<1h left";
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
      {label}
    </span>
  );
}

function labelFor(kind: AwardEntry["kind"]): string {
  switch (kind) {
    case "CHAMPION":
      return "Champion";
    case "RUNNER_UP":
      return "Runner-up";
    case "MVP":
      return "MVP";
  }
}
