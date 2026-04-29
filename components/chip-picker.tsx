"use client";

import { cn } from "@/lib/cn";

type Props = {
  /** Visible options. */
  options: readonly string[];
  /** Currently selected value (used to highlight the active chip). */
  value: string;
  /** Called when a chip is clicked. */
  onSelect: (value: string) => void;
  /** Optional aria-label for the group of chips. */
  ariaLabel?: string;
  /** Optional className for the container. */
  className?: string;
};

/**
 * A horizontal row of clickable chips. Used to seed text inputs from common
 * values (game names, payment templates, etc.). Purely presentational —
 * clicking a chip just calls `onSelect`. The parent owns state and decides
 * what the chip's label maps to.
 */
export function ChipPicker({
  options,
  value,
  onSelect,
  ariaLabel,
  className,
}: Props) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {options.map((opt) => {
        const active = opt.toLowerCase() === value.trim().toLowerCase();
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            aria-pressed={active}
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
              active
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-surface text-foreground-muted hover:border-zinc-600 hover:bg-surface-elevated hover:text-foreground",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
