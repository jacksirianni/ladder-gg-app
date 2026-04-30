import { Sparkline, rampToCurrent } from "./sparkline";
import { cn } from "@/lib/cn";

/**
 * v3.0: three-card "pulse" strip below the hero. Shows the user's
 * organizing/playing/live counts with synthetic ramp-to-current
 * sparklines. Real weekly history will replace the synthetic ramp
 * once we have a fact-table for it (v3.1+).
 */
type Props = {
  organizingCount: number;
  playingCount: number;
  liveCount: number;
};

export function Pulse({
  organizingCount,
  playingCount,
  liveCount,
}: Props) {
  const stats = [
    {
      label: "Organizing",
      value: organizingCount,
      sub: "leagues you run",
      color: "var(--primary)",
      highlight: false,
    },
    {
      label: "Playing",
      value: playingCount,
      sub: "teams you captain",
      color: "var(--primary-soft)",
      highlight: false,
    },
    {
      label: "Live now",
      value: liveCount,
      sub: liveCount === 1 ? "in progress" : "in progress",
      color: "var(--success)",
      highlight: liveCount > 0,
    },
  ];

  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "relative overflow-hidden rounded-xl border bg-surface px-5 py-5",
            s.highlight
              ? "border-[color-mix(in_oklab,var(--success)_40%,var(--border))] bg-gradient-to-br from-[color-mix(in_oklab,var(--success)_8%,var(--surface))] to-surface"
              : "border-border",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-foreground-subtle">
                {s.label}
              </p>
              <p
                className={cn(
                  "mt-2 font-mono text-4xl font-semibold leading-none tracking-[-0.025em]",
                  s.value > 0
                    ? s.highlight
                      ? "text-success"
                      : "text-primary"
                    : "text-foreground-muted",
                )}
              >
                {s.value}
              </p>
              <p className="mt-1.5 text-xs text-foreground-muted">{s.sub}</p>
            </div>
            <Sparkline
              values={rampToCurrent(s.value)}
              color={s.color}
              width={72}
              height={32}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
