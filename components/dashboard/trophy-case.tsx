import Link from "next/link";
import type { LeagueState } from "@prisma/client";
import { SectionTitle } from "./section-title";
import { abbreviateGame } from "@/lib/dashboard/format";
import { cn } from "@/lib/cn";

/**
 * v3.0: trophy case. Vertical stack of past-league rows. Wins get a
 * green left-edge glow + tinted background, losses are quiet, and
 * cancelled leagues are italicized at low opacity.
 *
 * Each row is a click target leading to the appropriate page —
 * recap for completed, manage for organizer-only on cancelled.
 */

export type TrophyRow = {
  leagueId: string;
  leagueSlug: string;
  leagueName: string;
  leagueState: LeagueState;
  game: string;
  championName: string | null;
  yourTeamName: string | null;
  youWon: boolean;
  role: "organizer" | "captain";
  completedAt: Date | null;
};

export function TrophyCase({ rows }: { rows: TrophyRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-12">
      <SectionTitle title="Trophy case" count={rows.length} />
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.leagueId}>
            <Row row={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ row }: { row: TrophyRow }) {
  const isWin = row.youWon;
  const isCompleted = row.leagueState === "COMPLETED";
  const isCancelled = row.leagueState === "CANCELLED";
  const href =
    row.role === "organizer"
      ? `/leagues/${row.leagueSlug}/manage`
      : `/leagues/${row.leagueSlug}/recap`;

  return (
    <Link
      href={href}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article
        className={cn(
          "relative overflow-hidden rounded-xl border bg-surface transition-colors",
          isWin
            ? "border-success/40 bg-gradient-to-r from-[color-mix(in_oklab,var(--success)_8%,var(--surface))] to-surface group-hover:border-success/60"
            : "border-border group-hover:border-border-strong",
          isCancelled && "opacity-65",
        )}
      >
        {isWin && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-[3px] bg-success shadow-[0_0_16px_var(--success)]"
          />
        )}
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-5 px-5 py-4 pl-6">
          {/* Trophy / dash / × icon */}
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border",
              isWin
                ? "border-success/35 bg-success/15"
                : isCompleted
                  ? "border-border bg-surface-2"
                  : "border-border bg-surface-2",
            )}
            aria-hidden
          >
            {isWin ? <TrophyIcon /> : <span className="font-mono text-sm text-foreground-muted">{isCancelled ? "×" : "—"}</span>}
          </span>

          {/* Name + game + role/date */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold tracking-[-0.015em] text-foreground">
                {row.leagueName}
              </h3>
              <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] tracking-[0.08em] text-foreground-subtle">
                · {abbreviateGame(row.game)}
              </span>
            </div>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-foreground-subtle">
              {row.role === "organizer" ? "Organized" : "Played"}
              {row.completedAt && (
                <>
                  {" · "}
                  {row.completedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
            </p>
          </div>

          {/* Champion column */}
          <div className="min-w-[140px] text-right">
            {isCompleted && row.championName ? (
              <>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-foreground-subtle">
                  Champion
                </p>
                <p
                  className={cn(
                    "mt-1 truncate text-sm font-semibold tracking-[-0.01em]",
                    isWin ? "text-success" : "text-foreground",
                  )}
                >
                  {row.championName}
                  {isWin && (
                    <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-success">
                      YOU
                    </span>
                  )}
                </p>
                {row.yourTeamName && !isWin && (
                  <p className="mt-0.5 truncate text-[11px] text-foreground-subtle">
                    Your team: {row.yourTeamName}
                  </p>
                )}
              </>
            ) : (
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
                {isCancelled ? "Cancelled" : "—"}
              </span>
            )}
          </div>

          {/* Caret */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className="text-foreground-subtle transition-colors group-hover:text-primary"
            aria-hidden
          >
            <path
              d="M9 6 L15 12 L9 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </article>
    </Link>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4 H17 V8 C17 11 14.5 13 12 13 C9.5 13 7 11 7 8 Z M5 5 H7 V8 C5 8 4 7 4 6 V5 Z M19 5 H17 V8 C19 8 20 7 20 6 V5 Z M9 13 V17 H15 V13 M8 17 H16 V20 H8 Z"
        stroke="var(--success)"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}
