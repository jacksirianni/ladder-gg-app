import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/cn";

type Props = {
  /** Deadline timestamp. If null, the component renders nothing. */
  closesAt: Date | null;
  /** Compact variant (single line, no eyebrow) for cramped layouts. */
  compact?: boolean;
  className?: string;
};

const URGENT_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Inline display of a league's registration deadline. Shows:
 *   - "Closes in 2d" / "Closes in 4h" for future deadlines
 *   - "Closes soon" + warning tone if under 12 hours
 *   - "Registration closed" for past deadlines
 *   - nothing if `closesAt` is null
 *
 * Uses `formatRelativeTime` so the unit chosen matches the rest of the
 * app (match modal, dashboard cards).
 */
export function RegistrationStatus({ closesAt, compact, className }: Props) {
  if (!closesAt) return null;

  const now = new Date();
  const deltaMs = closesAt.getTime() - now.getTime();
  const isPast = deltaMs <= 0;
  const isUrgent = !isPast && deltaMs < URGENT_THRESHOLD_MS;

  const label = isPast
    ? "Registration closed"
    : isUrgent
      ? `Closes soon · ${formatRelativeTime(closesAt)}`
      : `Closes ${formatRelativeTime(closesAt)}`;

  const tone = isPast
    ? "text-foreground-subtle"
    : isUrgent
      ? "text-warning"
      : "text-foreground-muted";

  if (compact) {
    return (
      <span className={cn("font-mono text-xs", tone, className)}>{label}</span>
    );
  }

  return (
    <p className={cn("font-mono text-xs", tone, className)}>{label}</p>
  );
}
