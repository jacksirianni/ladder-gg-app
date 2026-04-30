import Link from "next/link";
import { Countdown } from "./countdown";
import { SectionTitle } from "./section-title";
import { cn } from "@/lib/cn";

/**
 * v3.0: action queue. The dashboard's central bet — match-card-shaped
 * rows for each thing waiting on the user, not a generic todo list.
 *
 * Three action types in the queue:
 *   - REPORT  → match awaiting your report
 *   - CONFIRM → match awaiting your confirmation
 *   - PAY     → team payment still pending
 *
 * REPORT items get a primary-colored accent bar + soft glow on the
 * first row (priority). CONFIRM and PAY are quieter.
 */

export type ActionItem =
  | {
      kind: "REPORT" | "CONFIRM";
      id: string;
      leagueSlug: string;
      leagueName: string;
      round: number;
      yourTeamName: string;
      opponentName: string;
      deadlineIso: string;
      href: string;
    }
  | {
      kind: "PAY";
      id: string;
      leagueSlug: string;
      leagueName: string;
      yourTeamName: string;
      buyInCents: number;
      deadlineIso: string;
      href: string;
    };

export function ActionQueue({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <section className="mt-8">
        <SectionTitle title="On Deck" count={0} />
        <div className="mt-4 rounded-xl border border-dashed border-border bg-surface/30 px-6 py-8 text-center">
          <p className="text-sm text-foreground-muted">You&apos;re all caught up.</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground-subtle">
            no matches need your attention
          </p>
        </div>
      </section>
    );
  }

  // Server-render uses one fixed `now` for all initial countdown
  // values so SSR and the first client render agree.
  const initialNowMs = Date.now();

  return (
    <section className="mt-8">
      <SectionTitle title="On Deck" count={items.length} />
      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={item.id}>
            <ActionCard
              item={item}
              priority={i === 0 && item.kind === "REPORT"}
              initialNowMs={initialNowMs}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActionCard({
  item,
  priority,
  initialNowMs,
}: {
  item: ActionItem;
  priority: boolean;
  initialNowMs: number;
}) {
  const isReport = item.kind === "REPORT";
  const isPay = item.kind === "PAY";

  const eyebrowLabel =
    item.kind === "REPORT"
      ? "Report Score"
      : item.kind === "CONFIRM"
        ? "Confirm Score"
        : "Payment due";

  const buttonLabel =
    item.kind === "REPORT"
      ? "Report"
      : item.kind === "CONFIRM"
        ? "Review"
        : `Pay $${(item.buyInCents / 100).toFixed(0)}`;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative block overflow-hidden rounded-xl border bg-surface transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isReport ? "border-border hover:border-primary/40" : "border-border",
        priority &&
          "shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_25%,transparent),0_0_32px_color-mix(in_oklab,var(--primary)_10%,transparent)]",
      )}
    >
      {/* Left accent bar */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          isReport ? "bg-primary" : isPay ? "bg-warning opacity-70" : "bg-foreground-muted opacity-50",
        )}
      />

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-6 px-7 py-4 sm:gap-8">
        {/* Match info */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]",
                isReport
                  ? "bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-primary"
                  : isPay
                    ? "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-warning"
                    : "bg-surface-2 text-foreground-muted",
              )}
            >
              {eyebrowLabel}
            </span>
            <span className="font-mono text-xs text-foreground-subtle">
              {item.leagueName}
              {item.kind !== "PAY" && <> · R{item.round}</>}
            </span>
          </div>
          {item.kind === "PAY" ? (
            <p className="mt-2.5 text-[18px] font-semibold tracking-[-0.015em]">
              <span className="text-foreground">{item.yourTeamName}</span>
              <span className="px-3 font-mono text-xs font-medium text-foreground-subtle">
                buy-in
              </span>
              <span className="text-foreground-muted">
                ${(item.buyInCents / 100).toFixed(2)}
              </span>
            </p>
          ) : (
            <p className="mt-2.5 flex flex-wrap items-center gap-3.5 text-[18px] font-semibold tracking-[-0.015em]">
              <span className="text-foreground">{item.yourTeamName}</span>
              <span className="font-mono text-xs font-medium text-foreground-subtle">
                vs
              </span>
              <span className="text-foreground-muted">{item.opponentName}</span>
            </p>
          )}
        </div>

        {/* Deadline */}
        <Countdown deadlineIso={item.deadlineIso} initialNowMs={initialNowMs} />

        {/* CTA chip */}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors",
            isReport
              ? "bg-primary text-background group-hover:bg-primary-deep"
              : isPay
                ? "border border-warning/40 bg-warning/10 text-warning group-hover:bg-warning/20"
                : "border border-border bg-surface-2 text-foreground group-hover:bg-surface-elevated",
          )}
        >
          {buttonLabel}
          <svg
            width="12"
            height="12"
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
        </span>
      </div>
    </Link>
  );
}
