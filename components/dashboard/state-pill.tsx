import type { LeagueState } from "@prisma/client";
import { cn } from "@/lib/cn";

/**
 * v3.0: dashboard-flavored league state pill. Differs from the
 * sitewide `LeagueStateBadge` in two ways:
 *   - rounded-full lozenge with mono uppercase eyebrow type
 *   - IN_PROGRESS gets a pulsing dot to signal liveness at-a-glance
 *
 * Used inside dashboard surfaces (LeagueCard top row, ActionCard
 * eyebrow row). The sitewide LeagueStateBadge is left alone so the
 * rest of the app's chrome doesn't shift.
 */

const LABEL: Record<LeagueState, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  IN_PROGRESS: "Live",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type Tone = "primary" | "success" | "neutral";

const TONE: Record<LeagueState, Tone> = {
  DRAFT: "neutral",
  OPEN: "primary",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

const TONE_CLASS: Record<Tone, string> = {
  primary:
    "bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-primary border-[color-mix(in_oklab,var(--primary)_35%,transparent)]",
  success:
    "bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success border-[color-mix(in_oklab,var(--success)_35%,transparent)]",
  neutral: "bg-surface-2 text-foreground-muted border-border",
};

const DOT_CLASS: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  neutral: "bg-foreground-subtle",
};

export function StatePill({
  state,
  className,
}: {
  state: LeagueState;
  className?: string;
}) {
  const tone = TONE[state];
  const isLive = state === "IN_PROGRESS";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.1em]",
        TONE_CLASS[tone],
        className,
      )}
    >
      {isLive && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full ladder-pulse", DOT_CLASS[tone])}
        />
      )}
      {LABEL[state]}
    </span>
  );
}
