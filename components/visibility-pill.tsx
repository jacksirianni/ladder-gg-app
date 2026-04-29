import type { LeagueVisibility } from "@prisma/client";
import { cn } from "@/lib/cn";

const STYLES: Record<
  LeagueVisibility,
  { label: string; className: string }
> = {
  OPEN_JOIN: {
    label: "Open registration",
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  UNLISTED: {
    label: "Unlisted",
    className: "border-border bg-surface text-foreground-muted",
  },
  INVITE_ONLY: {
    label: "Invite only",
    className: "border-warning/40 bg-warning/10 text-warning",
  },
};

type Props = {
  visibility: LeagueVisibility;
  className?: string;
};

/**
 * Pill that surfaces a league's visibility next to the state badge on
 * the public league page, manage page, and join page. Colors match the
 * intended audience reaction:
 *   - OPEN_JOIN: primary-violet (active/inviting)
 *   - UNLISTED: neutral (no special tone)
 *   - INVITE_ONLY: warning-amber (gated)
 */
export function VisibilityPill({ visibility, className }: Props) {
  const style = STYLES[visibility];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-xs",
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
