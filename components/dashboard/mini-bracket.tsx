/**
 * v3.0: tiny inline bracket viz embedded on each LeagueCard.
 *
 * Generalizes the redesign's 8-team math to handle 4 / 8 / 16 team
 * single-elim brackets. For DOUBLE_ELIM leagues we render the
 * winners-bracket only (concession: rendering both brackets at this
 * size becomes illegible — caveat noted in the calling LeagueCard).
 *
 * Slot occupants are derived from team aliveness alone: for each
 * pair of slots in round r-1, the alive team advances to round r.
 * If both are still alive, the round-r slot is "TBD" (not yet
 * played). This handles the partial-progress bracket without
 * needing per-match winnerTeamId lookups.
 *
 * Colors are pulled from CSS vars (`var(--primary)` etc.) via
 * inline `fill`/`stroke` on the SVG primitives — the only place we
 * reach for raw color values, since SVG doesn't pick up Tailwind
 * arbitrary classes.
 */

export type BracketTeam = {
  id: string;
  name: string;
  isYou: boolean;
  alive: boolean;
};

export type BracketData = {
  totalRounds: number;
  currentRound: number;
  /** Sorted by initial bracket position. Length must equal 2^totalRounds. */
  teams: BracketTeam[];
};

type Props = {
  bracket: BracketData;
  compact?: boolean;
};

export function MiniBracket({ bracket, compact = true }: Props) {
  const teams = bracket.teams;
  const totalRounds = bracket.totalRounds;

  // Layout
  const slotW = compact ? 70 : 82;
  const slotH = compact ? 14 : 16;
  const slotGap = 4;
  const colGap = 14;
  const colStride = slotW + colGap;

  const round1Slots = teams.length;
  const totalH = round1Slots * slotH + (round1Slots - 1) * slotGap;
  const totalW = totalRounds * slotW + (totalRounds - 1) * colGap;

  // Top-y for slot `i` in round `r` (0-indexed; round 0 = R1).
  // In round r, each slot covers 2^r round-1 slots. Center between
  // those source slots so the bracket pyramids correctly.
  const yForSlot = (round: number, i: number) => {
    const span = Math.pow(2, round);
    const startIdx = i * span;
    const endIdx = startIdx + span - 1;
    const yStart = startIdx * (slotH + slotGap);
    const yEnd = endIdx * (slotH + slotGap) + slotH;
    return (yStart + yEnd) / 2 - slotH / 2;
  };

  // Walk forward computing each round's occupants.
  const slotsByRound: Array<Array<BracketTeam | null>> = [];
  slotsByRound[0] = teams.map((t) => (t.alive ? t : null));
  for (let r = 1; r < totalRounds; r++) {
    const prev = slotsByRound[r - 1];
    const next: Array<BracketTeam | null> = [];
    for (let i = 0; i < prev.length / 2; i++) {
      const a = prev[i * 2];
      const b = prev[i * 2 + 1];
      if (a && !b) next.push(a);
      else if (b && !a) next.push(b);
      else next.push(null); // both alive (not yet played) or both eliminated
    }
    slotsByRound[r] = next;
  }

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="block"
      aria-label="Mini bracket"
    >
      {/* Connectors first so they sit under the slots. */}
      {Array.from({ length: totalRounds - 1 }).map((_, r) => {
        const xRight = r * colStride + slotW;
        const xMid = xRight + colGap / 2;
        const xLeftNext = (r + 1) * colStride;
        const matchesInNext = slotsByRound[r].length / 2;
        return Array.from({ length: matchesInNext }).map((__, m) => {
          const yA = yForSlot(r, m * 2) + slotH / 2;
          const yB = yForSlot(r, m * 2 + 1) + slotH / 2;
          const yMid = yForSlot(r + 1, m) + slotH / 2;
          return (
            <g
              key={`c-${r}-${m}`}
              stroke="var(--border)"
              strokeWidth="1"
              fill="none"
            >
              <path d={`M${xRight} ${yA} H${xMid} V${yMid}`} />
              <path d={`M${xRight} ${yB} H${xMid} V${yMid}`} />
              <path d={`M${xMid} ${yMid} H${xLeftNext}`} />
            </g>
          );
        });
      })}

      {/* Round 1 — every team renders, eliminated styled out. */}
      {teams.map((t, i) => {
        const y = i * (slotH + slotGap);
        const isYou = t.isYou;
        const alive = t.alive;
        const fill = isYou
          ? "var(--primary)"
          : alive
            ? "color-mix(in oklab, var(--primary) 28%, var(--surface-2))"
            : "var(--surface-2)";
        const stroke = isYou
          ? "var(--primary-soft)"
          : alive
            ? "var(--border)"
            : "transparent";
        const textFill = isYou
          ? "var(--background)"
          : alive
            ? "var(--foreground)"
            : "var(--foreground-subtle)";
        const display = trim(t.name, compact ? 9 : 11);
        return (
          <g key={t.id} opacity={alive ? 1 : 0.55}>
            <rect
              x="0"
              y={y}
              width={slotW}
              height={slotH}
              rx="2"
              fill={fill}
              stroke={stroke}
            />
            <text
              x="5"
              y={y + slotH / 2 + 3}
              fill={textFill}
              fontFamily="var(--font-geist-mono), ui-monospace, monospace"
              fontSize="8.5"
              fontWeight={isYou ? 600 : 500}
              textDecoration={alive ? "none" : "line-through"}
            >
              {display}
            </text>
          </g>
        );
      })}

      {/* Later rounds — derived occupants. */}
      {slotsByRound.slice(1).map((slots, idx) => {
        const r = idx + 1;
        const x = r * colStride;
        const slotsLeft = slots.length;
        return slots.map((team, i) => {
          const y = yForSlot(r, i);
          if (!team) {
            return (
              <g key={`s-${r}-${i}`}>
                <rect
                  x={x}
                  y={y}
                  width={slotW}
                  height={slotH}
                  rx="2"
                  fill="transparent"
                  stroke="var(--border)"
                  strokeDasharray="2 2"
                />
                <text
                  x={x + slotW / 2}
                  y={y + slotH / 2 + 3}
                  textAnchor="middle"
                  fill="var(--foreground-subtle)"
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  fontSize="8.5"
                >
                  TBD
                </text>
              </g>
            );
          }
          const isYou = team.isYou;
          const isFinal = r === totalRounds - 1 && slotsLeft === 1;
          const fill = isYou
            ? "var(--primary)"
            : isFinal
              ? "var(--success)"
              : "color-mix(in oklab, var(--primary) 55%, transparent)";
          const stroke = isYou ? "var(--primary-soft)" : "transparent";
          const textFill = isYou || isFinal ? "var(--background)" : "var(--foreground)";
          const display = trim(team.name, compact ? 9 : 11);
          return (
            <g key={`s-${r}-${i}`}>
              <rect
                x={x}
                y={y}
                width={slotW}
                height={slotH}
                rx="2"
                fill={fill}
                stroke={stroke}
              />
              <text
                x={x + 5}
                y={y + slotH / 2 + 3}
                fill={textFill}
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                fontSize="8.5"
                fontWeight={isYou || isFinal ? 600 : 500}
              >
                {display}
              </text>
            </g>
          );
        });
      })}
    </svg>
  );
}

function trim(name: string, max: number): string {
  if (name.length <= max) return name;
  return `${name.slice(0, Math.max(1, max - 1))}…`;
}
