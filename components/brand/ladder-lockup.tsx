// LadderLockup — bracket mark + Geist Mono wordmark.
//
// Use anywhere you'd otherwise reach for a logo image. Inherits the
// surrounding theme via CSS variables; pass `mode="light"` (or color
// overrides) on light surfaces.

import type { CSSProperties } from "react";
import { LadderMark } from "./ladder-mark";

type Variant = "horizontal" | "stacked";
type Mode = "dark" | "light";

type LadderLockupProps = {
  variant?: Variant;
  mode?: Mode;
  /** Wordmark font-size in px. The mark scales proportionally. */
  size?: number;
  className?: string;
  /** Override the mark path color. */
  pathColor?: string;
  /** Override the champion node color. */
  championColor?: string;
  /** Override the wordmark text color. */
  textColor?: string;
  /** Override the `.gg` accent color. */
  accentColor?: string;
};

const PALETTE_TEXT: Record<Mode, { fg: string; accent: string }> = {
  dark: { fg: "#FAFAFA", accent: "#A78BFA" },
  light: { fg: "#0A0A0C", accent: "#8B5CF6" },
};

export function LadderLockup({
  variant = "horizontal",
  mode,
  size = 15,
  className,
  pathColor,
  championColor,
  textColor,
  accentColor,
}: LadderLockupProps) {
  // Mark height ~= wordmark cap-height x 1.45 (empirical, matches spec).
  const markHeight = Math.round(size * 1.45);
  const markWidth = Math.round(markHeight * (28 / 22));

  const fg =
    textColor ?? (mode ? PALETTE_TEXT[mode].fg : "var(--foreground)");
  const accent =
    accentColor ?? (mode ? PALETTE_TEXT[mode].accent : "var(--primary)");

  const wordmarkStyle: CSSProperties = {
    letterSpacing: "-0.01em",
    fontSize: size,
    color: fg,
    lineHeight: 1,
  };

  const wordmark = (
    <span className="font-mono font-semibold" style={wordmarkStyle}>
      LADDER<span style={{ color: accent }}>.gg</span>
    </span>
  );

  if (variant === "stacked") {
    return (
      <div
        className={className}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <LadderMark
          variant="compact"
          mode={mode}
          pathColor={pathColor}
          championColor={championColor}
          width={markWidth * 2.3}
          height={markHeight * 2.2}
          aria-hidden="true"
          role={undefined}
          aria-label={undefined}
        />
        {wordmark}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      <LadderMark
        variant="compact"
        mode={mode}
        pathColor={pathColor}
        championColor={championColor}
        width={markWidth}
        height={markHeight}
        aria-hidden="true"
        role={undefined}
        aria-label={undefined}
      />
      {wordmark}
    </div>
  );
}
