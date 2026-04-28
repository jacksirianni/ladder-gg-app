// LadderMark — the LADDER.gg "bracket diagram" mark.
//
// Three scale-tuned variants. The geometry differs between them, not just
// the size — pick `variant` based on render size.
//
// By default the mark uses CSS variables (--primary, --success) so it
// inherits the surrounding theme. Pass `mode="dark" | "light"` for the
// brand-spec palette explicitly, or pathColor / championColor to override
// either color individually.
//
// Geometry, opacities, stroke widths, and corner radii match the design
// handoff verbatim. Do not redraw.

import type { SVGAttributes } from "react";

type Variant = "full" | "compact" | "minimal";
type Mode = "dark" | "light";

type LadderMarkProps = SVGAttributes<SVGSVGElement> & {
  variant?: Variant;
  mode?: Mode;
  /** Override the path color. */
  pathColor?: string;
  /** Override the champion node color. */
  championColor?: string;
};

const PALETTE: Record<Mode, { path: string; champion: string }> = {
  dark: { path: "#A78BFA", champion: "#22C55E" },
  light: { path: "#8B5CF6", champion: "#16A34A" },
};

function resolveColors(
  mode: Mode | undefined,
  pathColor: string | undefined,
  championColor: string | undefined,
) {
  const path =
    pathColor ?? (mode ? PALETTE[mode].path : "var(--primary)");
  const champion =
    championColor ?? (mode ? PALETTE[mode].champion : "var(--success)");
  return { path, champion };
}

export function LadderMark({
  variant = "compact",
  mode,
  pathColor,
  championColor,
  ...rest
}: LadderMarkProps) {
  const { path: p, champion: g } = resolveColors(mode, pathColor, championColor);

  // Default a11y: announces as "LADDER.gg". When passed aria-hidden via rest,
  // this default loses to the spread (later wins).
  const a11y = { role: "img" as const, "aria-label": "LADDER.gg" };

  if (variant === "full") {
    return (
      <svg viewBox="0 0 160 120" fill="none" {...a11y} {...rest}>
        <rect x="10" y="14" width="14" height="14" rx="2" fill={p} />
        <rect x="10" y="38" width="14" height="14" rx="2" fill={p} opacity="0.5" />
        <rect x="10" y="68" width="14" height="14" rx="2" fill={p} />
        <rect x="10" y="92" width="14" height="14" rx="2" fill={p} opacity="0.5" />
        <path d="M24 21 H44 V49 H64" stroke={p} strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M24 45 H44 V49" stroke={p} strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M24 75 H44 V73 H64" stroke={p} strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M24 99 H44 V73" stroke={p} strokeWidth="2" fill="none" opacity="0.4" />
        <rect x="64" y="42" width="14" height="14" rx="2" fill={p} />
        <rect x="64" y="66" width="14" height="14" rx="2" fill={p} opacity="0.6" />
        <path d="M78 49 H100 V61 H120" stroke={p} strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M78 73 H100 V61" stroke={p} strokeWidth="2" fill="none" opacity="0.4" />
        <rect x="120" y="54" width="22" height="14" rx="2" fill={g} />
      </svg>
    );
  }

  if (variant === "minimal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" {...a11y} {...rest}>
        <rect x="2" y="3" width="5" height="5" rx="1" fill={p} />
        <rect x="2" y="16" width="5" height="5" rx="1" fill={p} opacity="0.55" />
        <path d="M7 5.5 H11 V12 H15" stroke={p} strokeWidth="1.4" fill="none" />
        <path d="M7 18.5 H11 V12" stroke={p} strokeWidth="1.4" fill="none" opacity="0.5" />
        <rect x="15" y="9.5" width="7" height="5" rx="1" fill={g} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 56 56" fill="none" {...a11y} {...rest}>
      <rect x="6" y="8" width="10" height="10" rx="2" fill={p} />
      <rect x="6" y="38" width="10" height="10" rx="2" fill={p} opacity="0.5" />
      <path d="M16 13 H26 V28 H36" stroke={p} strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M16 43 H26 V28" stroke={p} strokeWidth="2" fill="none" opacity="0.4" />
      <rect x="36" y="22" width="14" height="12" rx="2" fill={g} />
    </svg>
  );
}
