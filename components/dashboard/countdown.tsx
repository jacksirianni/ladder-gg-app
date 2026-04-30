"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * v3.0: live-ticking countdown chip used inside ActionCard. Server
 * renders a static value (seeded by `initialNowMs`) so there's no
 * hydration mismatch; the client-side useEffect kicks in to update
 * once per minute.
 *
 * `deadline` is the Date by which the action becomes overdue. We
 * compute time-remaining in the client so multiple cards stay
 * synchronized to one timer.
 */
type Props = {
  /** ISO date string for the deadline (so we can pass through SC→CC). */
  deadlineIso: string;
  /** Server-side now() for the initial render — avoids hydration drift. */
  initialNowMs: number;
};

export function Countdown({ deadlineIso, initialNowMs }: Props) {
  const deadlineMs = new Date(deadlineIso).getTime();
  const [now, setNow] = useState(initialNowMs);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick(); // align immediately on mount
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const remaining = deadlineMs - now;
  const overdue = remaining <= 0;
  const hours = Math.floor(Math.abs(remaining) / (60 * 60 * 1000));
  const minutes = Math.floor(
    (Math.abs(remaining) % (60 * 60 * 1000)) / (60 * 1000),
  );
  const days = Math.floor(hours / 24);

  let label: string;
  if (overdue) {
    label = "overdue";
  } else if (days >= 1) {
    label = `${days}d ${hours % 24}h`;
  } else if (hours >= 1) {
    label = `${hours}h ${minutes}m`;
  } else {
    label = `${minutes}m`;
  }

  const urgent = overdue || (remaining > 0 && hours < 6);

  return (
    <div className="text-right">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground-subtle">
        {overdue ? "Overdue" : urgent ? "Due in" : "Due"}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-[17px] font-semibold tracking-[-0.01em]",
          urgent ? "text-warning" : "text-foreground",
        )}
      >
        {label}
      </div>
    </div>
  );
}
