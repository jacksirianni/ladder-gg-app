import Link from "next/link";
import { AmbientBracket } from "./ambient-bracket";

/**
 * v3.0: dashboard hero. Welcome line + at-a-glance status row +
 * primary CTA. Replaces the old `Hi, {name}` header.
 *
 * Three numbers narrate the user's current state:
 *   - liveCount   → matches/leagues happening now (success-green dot)
 *   - actionCount → things waiting on this user (warning-amber)
 *   - totalLeagues → lifetime breadth (muted)
 *
 * The ambient bracket SVG sits behind the foreground content at
 * ~55% opacity, masked by a radial glow on the right so the CTA
 * still has a clean target area.
 */
type Props = {
  displayName: string;
  liveCount: number;
  actionCount: number;
  totalLeagues: number;
};

export function DashHero({
  displayName,
  liveCount,
  actionCount,
  totalLeagues,
}: Props) {
  // Date string is fine to render on the server — it'll show whatever
  // date the deploy region computed, which for our user base is
  // close-enough. "Tuesday · Apr 30" feel.
  const dateStr = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-background px-8 py-10 md:px-12 md:py-11">
      <AmbientBracket />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-8">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-foreground-subtle">
            LADDER · DASHBOARD · {dateStr}
          </div>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.0] tracking-[-0.035em] text-foreground md:text-[56px]">
            Welcome back,{" "}
            <span className="text-primary">{displayName}</span>.
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <StatusLine
              count={liveCount}
              label="live now"
              color="success"
              pulse
            />
            <StatusLine
              count={actionCount}
              label={
                actionCount === 1 ? "needs your attention" : "need your attention"
              }
              color={actionCount > 0 ? "warning" : "muted"}
            />
            <StatusLine
              count={totalLeagues}
              label="leagues total"
              color="muted"
            />
          </div>
        </div>
        <Link
          href="/leagues/new"
          className="group inline-flex shrink-0 items-center gap-2.5 rounded-[10px] bg-primary px-6 py-3.5 text-[15px] font-semibold tracking-[-0.01em] text-background shadow-[0_0_32px_color-mix(in_oklab,var(--primary)_35%,transparent)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_48px_color-mix(in_oklab,var(--primary)_50%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Create a league
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className="transition-transform group-hover:translate-x-0.5"
          >
            <path
              d="M5 12 H19 M13 6 L19 12 L13 18"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}

function StatusLine({
  count,
  label,
  color,
  pulse = false,
}: {
  count: number;
  label: string;
  color: "success" | "warning" | "muted";
  pulse?: boolean;
}) {
  const numberColor =
    count === 0
      ? "text-foreground-muted"
      : color === "success"
        ? "text-success"
        : color === "warning"
          ? "text-warning"
          : "text-foreground-muted";
  const dotColor =
    color === "success" ? "bg-success" : color === "warning" ? "bg-warning" : "bg-foreground-subtle";
  return (
    <div className="inline-flex items-center gap-2">
      {pulse && count > 0 && (
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full shadow-[0_0_12px_currentColor] ladder-pulse ${dotColor}`}
        />
      )}
      <span
        className={`font-mono text-[32px] font-semibold leading-none tracking-[-0.02em] ${numberColor}`}
      >
        {count}
      </span>
      <span className="text-[13px] text-foreground-muted">{label}</span>
    </div>
  );
}
