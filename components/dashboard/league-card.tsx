import Link from "next/link";
import type { LeagueState, PaymentStatus } from "@prisma/client";
import { StatePill } from "./state-pill";
import { MiniBracket, type BracketData } from "./mini-bracket";
import { abbreviateGame } from "@/lib/dashboard/format";
import { cn } from "@/lib/cn";

/**
 * v3.0: league card. Two-region card that swaps content based on
 * state:
 *   - IN_PROGRESS → embedded MiniBracket (the redesign's hero feature)
 *   - DRAFT/OPEN  → registration progress bar + slot strip
 *   - COMPLETED   → muted outcome line (caller usually surfaces this
 *                   via TrophyCase instead, but the card still renders)
 *
 * Click target is the whole card; goes to manage-page for organizer
 * role and public page for captain role.
 */

type Role = "organizer" | "captain";

type Props = {
  href: string;
  role: Role;
  state: LeagueState;
  name: string;
  game: string;
  teamSize: number;
  teams: number;
  maxTeams: number;
  buyInCents: number;
  startsAt: Date | null;
  /** Captain role only — the team the user captains in this league. */
  teamName?: string;
  paymentStatus?: PaymentStatus;
  /** Number of pending dashboard actions tied to this league. */
  pendingActions?: number;
  /** Set when the league is IN_PROGRESS so we can render MiniBracket. */
  bracket?: BracketData | null;
  /** Hint shown under the bracket viz: "Bracket · Round X of Y". */
  bracketRoundLabel?: string | null;
  /** Whether this is a DOUBLE_ELIM league — surfaces a small note since
      MiniBracket only renders the winners bracket. */
  isDoubleElim?: boolean;
};

export function LeagueCard({
  href,
  role,
  state,
  name,
  game,
  teams,
  maxTeams,
  buyInCents,
  startsAt,
  teamName,
  paymentStatus,
  pendingActions = 0,
  bracket,
  bracketRoundLabel,
  isDoubleElim = false,
}: Props) {
  const showBracket = bracket && state === "IN_PROGRESS";
  const aliveCount = bracket ? bracket.teams.filter((t) => t.alive).length : 0;

  return (
    <Link
      href={href}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article className="overflow-hidden rounded-xl border border-border bg-surface transition-colors group-hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] group-hover:bg-[color-mix(in_oklab,var(--primary)_4%,var(--surface))]">
        {/* Top region */}
        <div className="px-5 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <StatePill state={state} />
              {pendingActions > 0 && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-warning">
                  <span aria-hidden className="h-1 w-1 rounded-full bg-warning" />
                  {pendingActions} pending
                </span>
              )}
            </div>
            <span className="shrink-0 whitespace-nowrap font-mono text-[11px] tracking-[0.08em] text-foreground-subtle">
              {abbreviateGame(game)}
            </span>
          </div>

          <h3 className="mt-3.5 text-[19px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
            {name}
          </h3>

          {role === "captain" && teamName && (
            <p className="mt-1 text-xs text-foreground-muted">
              Captain of{" "}
              <span className="font-medium text-primary">{teamName}</span>
              {paymentStatus === "PENDING" && (
                <span className="ml-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-warning">
                  · Pay
                </span>
              )}
            </p>
          )}
          {role === "organizer" && (
            <p className="mt-1 text-xs text-foreground-muted">
              You&apos;re organizing
            </p>
          )}
        </div>

        {/* Bottom region — bracket viz, in-progress summary, or
            registration progress (in that order of preference). */}
        <div className="mt-4 border-t border-border bg-background px-5 py-4">
          {showBracket && bracket ? (
            <BracketRegion
              bracket={bracket}
              roundLabel={bracketRoundLabel ?? ""}
              alive={aliveCount}
              isDoubleElim={isDoubleElim}
            />
          ) : state === "IN_PROGRESS" ? (
            <InProgressSummary
              teams={teams}
              maxTeams={maxTeams}
              roundLabel={bracketRoundLabel ?? null}
            />
          ) : (
            <RegistrationRegion
              teams={teams}
              maxTeams={maxTeams}
              buyInCents={buyInCents}
              startsAt={startsAt}
            />
          )}
        </div>
      </article>
    </Link>
  );
}

function BracketRegion({
  bracket,
  roundLabel,
  alive,
  isDoubleElim,
}: {
  bracket: BracketData;
  roundLabel: string;
  alive: number;
  isDoubleElim: boolean;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground-subtle">
          {roundLabel}
        </span>
        <span className="font-mono text-[10px] text-foreground-subtle">
          {alive} alive
          {isDoubleElim && (
            <span className="ml-2 text-foreground-subtle">· winners only</span>
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <MiniBracket bracket={bracket} compact />
      </div>
    </div>
  );
}

/**
 * Fallback for IN_PROGRESS leagues that don't fit the MiniBracket
 * constraints (non-power-of-2 team counts, 32-team brackets, etc.).
 * Shows a single "Round X of Y" line so the card still has signal,
 * without the bracket viz.
 */
function InProgressSummary({
  teams,
  maxTeams,
  roundLabel,
}: {
  teams: number;
  maxTeams: number;
  roundLabel: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground-subtle">
        {roundLabel ?? "Bracket in progress"}
      </span>
      <span className="font-mono text-[11px] text-foreground-subtle">
        {teams} of {maxTeams} teams
      </span>
    </div>
  );
}

function RegistrationRegion({
  teams,
  maxTeams,
  buyInCents,
  startsAt,
}: {
  teams: number;
  maxTeams: number;
  buyInCents: number;
  startsAt: Date | null;
}) {
  const slotCount = Math.min(maxTeams, 32); // cap slot strip width
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground-subtle">
          Registration
        </span>
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {teams}
          <span className="text-foreground-subtle">/{maxTeams}</span>
        </span>
      </div>
      <div
        className="grid h-2 gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${slotCount}, 1fr)` }}
      >
        {Array.from({ length: slotCount }).map((_, i) => {
          // Map the actual team count onto the capped slot strip.
          const isFilled = i < Math.round((teams / maxTeams) * slotCount);
          return (
            <span
              key={i}
              aria-hidden
              className={cn(
                "rounded-[1px]",
                isFilled ? "bg-primary" : "bg-surface-2 opacity-50",
              )}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-foreground-muted">
        <span>
          {buyInCents > 0 ? `$${(buyInCents / 100).toFixed(2)} entry` : "Free entry"}
        </span>
        {startsAt && (
          <span>
            Starts{" "}
            {startsAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            ·{" "}
            {startsAt.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
