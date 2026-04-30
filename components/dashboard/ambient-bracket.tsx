/**
 * v3.0: ambient bracket geometry rendered behind the DashHero. Pure
 * decoration — faint lines + floating nodes, masked by a soft radial
 * glow on the right side. Pure SVG; renders on the server.
 *
 * Designed to *suggest* the platform's purpose (brackets) without
 * loading enough visual weight to compete with the headline + CTA.
 */
export function AmbientBracket() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 320"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 opacity-55"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="ambient-bracket-fade"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
          <stop offset="40%" stopColor="var(--primary)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id="ambient-bracket-glow" cx="0.7" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="320" fill="url(#ambient-bracket-glow)" />
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 30 + i * 36;
        const startX = -50 + i * 6;
        const stem = 120 + (i % 2) * 40;
        return (
          <g
            key={i}
            stroke="url(#ambient-bracket-fade)"
            strokeWidth="1"
            fill="none"
            opacity={0.3 + (i % 3) * 0.15}
          >
            <path d={`M${startX} ${y} H${stem} V${y + 18} H260`} />
          </g>
        );
      })}
      {/* Floating bracket nodes — one champion-green to hint at the
          terminal state of every league. */}
      {[
        { x: 80, y: 60, size: 6, op: 0.6 },
        { x: 180, y: 140, size: 8, op: 0.8 },
        { x: 320, y: 95, size: 6, op: 0.5 },
        { x: 460, y: 180, size: 10, op: 0.9, gold: true },
        { x: 240, y: 240, size: 5, op: 0.4 },
      ].map((n, i) => (
        <rect
          key={i}
          x={n.x}
          y={n.y}
          width={n.size}
          height={n.size}
          rx="1"
          fill={n.gold ? "var(--success)" : "var(--primary)"}
          opacity={n.op}
        />
      ))}
    </svg>
  );
}
