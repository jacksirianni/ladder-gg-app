/**
 * Format an ISO date / Date / number into a short relative-time string.
 *
 * Uses `Intl.RelativeTimeFormat` for localization-friendly output:
 * "just now", "5m ago", "2h ago", "3d ago", "Apr 12".
 *
 * After ~7 days we fall back to an absolute short date so we don't end up
 * with "12w ago" — which is hard to read at a glance.
 *
 * Designed for server-render: the value is computed once. We don't tick
 * client-side, which is fine for our use cases (match audit timestamps,
 * dashboard reminders).
 */
export function formatRelativeTime(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;

  // Future dates are unusual here; if they happen we still want a sensible
  // string instead of "in 5 minutes" looking weird in our flow.
  const past = diffMs <= 0;

  if (absMs < 30 * SECOND) {
    return "just now";
  }

  const rtf = new Intl.RelativeTimeFormat("en", { style: "short" });

  if (absMs < HOUR) {
    const minutes = Math.round(absMs / MINUTE);
    return rtf.format(past ? -minutes : minutes, "minute");
  }
  if (absMs < DAY) {
    const hours = Math.round(absMs / HOUR);
    return rtf.format(past ? -hours : hours, "hour");
  }
  if (absMs < WEEK) {
    const days = Math.round(absMs / DAY);
    return rtf.format(past ? -days : days, "day");
  }

  // Beyond a week: fall back to a short absolute date.
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
