import Link from "next/link";
import { Button } from "@/components/ui/button";

export type ActionQueueItem = {
  matchId: string;
  leagueSlug: string;
  leagueName: string;
  /** What the captain needs to do. */
  action: "report" | "confirm";
  round: number;
  bracketPosition: number;
  /** Captain's own team name in this match. */
  yourTeamName: string;
  /** Opposing team name in this match (or "TBD" if not yet set). */
  opponentName: string;
};

type Props = {
  items: ActionQueueItem[];
  /** Cap how many to show inline. Anything beyond this is hidden behind a
   * "+N more" line. */
  limit?: number;
};

const actionLabel: Record<ActionQueueItem["action"], string> = {
  report: "Report",
  confirm: "Confirm",
};

const actionEyebrow: Record<ActionQueueItem["action"], string> = {
  report: "Awaiting your report",
  confirm: "Awaiting your confirm",
};

/**
 * Top-of-dashboard pinned panel that lists specific match actions a captain
 * needs to take. Each row deep-links to the league page with a `?match=`
 * search param, which the league page reads to auto-open the match modal.
 *
 * Returns null if there are no items, so the dashboard can render the
 * panel unconditionally.
 */
export function ActionQueue({ items, limit = 5 }: Props) {
  if (items.length === 0) return null;

  const visible = items.slice(0, limit);
  const hiddenCount = items.length - visible.length;

  return (
    <section
      aria-label="Actions needed"
      className="mt-8 rounded-lg border border-warning/40 bg-warning/5 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-warning">
          {items.length} action{items.length === 1 ? "" : "s"} needed
        </p>
        <p className="font-mono text-[11px] text-foreground-subtle">
          Tap one to jump in
        </p>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {visible.map((item) => {
          const href =
            `/leagues/${item.leagueSlug}?match=${encodeURIComponent(item.matchId)}`;
          return (
            <li key={item.matchId}>
              <Link
                href={href}
                className="group flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:border-warning/50 hover:bg-surface-elevated"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-warning">
                    {actionEyebrow[item.action]}
                  </p>
                  <p className="mt-1 truncate text-sm">
                    <span className="font-mono text-xs text-foreground-subtle">
                      R{item.round}·M{item.bracketPosition}
                    </span>
                    <span className="px-2 text-foreground-subtle">·</span>
                    <span className="font-medium">{item.yourTeamName}</span>
                    <span className="px-2 text-foreground-subtle">vs</span>
                    <span className="font-medium">{item.opponentName}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-foreground-subtle">
                    in {item.leagueName}
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant={item.action === "report" ? "primary" : "secondary"}
                >
                  {/* Anchor inherits href via Link, but we still want a
                       Button-styled affordance. The outer Link handles
                       navigation; this is purely visual. */}
                  <span aria-hidden>{actionLabel[item.action]} →</span>
                </Button>
              </Link>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && (
        <p className="mt-3 font-mono text-xs text-foreground-subtle">
          +{hiddenCount} more in your leagues below
        </p>
      )}
    </section>
  );
}
