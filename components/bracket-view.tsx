import type { ComponentProps } from "react";
import type { MatchBracket } from "@prisma/client";
import { BracketNode } from "@/components/bracket-node";

type Match = ComponentProps<typeof BracketNode>["match"];

type Props = {
  matches: Match[];
};

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quarterfinal";
  return `Round ${round}`;
}

/** v2.0: LB rounds get their own label conventions. */
function losersRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Losers final";
  if (round === totalRounds - 1) return "Losers semi";
  return `Losers R${round}`;
}

/**
 * v2.0: bracket view now handles double-elim. Renders three labeled
 * sections (Winners / Losers / Grand final) when the match list contains
 * non-WINNERS bracket entries; otherwise renders the legacy single-
 * bracket layout. Sections stack vertically — desktop and mobile share
 * the same structure (mobile polish in v2.0-C).
 */
export function BracketView({ matches }: Props) {
  if (matches.length === 0) {
    return null;
  }

  const wbMatches = matches.filter((m) => m.bracket === "WINNERS");
  const lbMatches = matches.filter((m) => m.bracket === "LOSERS");
  const gfMatches = matches.filter(
    (m) => m.bracket === "GRAND_FINAL" || m.bracket === "GRAND_RESET",
  );

  const isDoubleElim = lbMatches.length > 0 || gfMatches.length > 0;

  if (!isDoubleElim) {
    // Legacy single-elim layout — preserves exact prior behavior.
    return <BracketColumns matches={wbMatches} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <BracketSection
        title="Winners bracket"
        matches={wbMatches}
        bracketKind="WINNERS"
      />
      {lbMatches.length > 0 && (
        <BracketSection
          title="Losers bracket"
          matches={lbMatches}
          bracketKind="LOSERS"
        />
      )}
      {gfMatches.length > 0 && (
        <BracketSection
          title="Grand final"
          matches={gfMatches}
          bracketKind="GRAND_FINAL"
        />
      )}
    </div>
  );
}

function BracketSection({
  title,
  matches,
  bracketKind,
}: {
  title: string;
  matches: Match[];
  bracketKind: MatchBracket;
}) {
  if (matches.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        {title}
      </h3>
      <BracketColumns matches={matches} bracketKind={bracketKind} />
    </section>
  );
}

function BracketColumns({
  matches,
  bracketKind = "WINNERS",
}: {
  matches: Match[];
  bracketKind?: MatchBracket;
}) {
  // Group by round.
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  const rounds = [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, ms]) => ({
      round,
      matches: ms.sort((a, b) => a.bracketPosition - b.bracketPosition),
    }));

  if (rounds.length === 0) return null;

  const totalRounds = rounds[rounds.length - 1].round;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit gap-6 pb-2">
        {rounds.map(({ round, matches }) => (
          <div key={round} className="flex min-w-44 flex-col gap-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              {labelForRound(bracketKind, round, totalRounds)}
            </h4>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {matches.map((m) => (
                <BracketNode
                  key={`${m.round}-${m.bracketPosition}`}
                  match={m}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function labelForRound(
  bracket: MatchBracket,
  round: number,
  totalRounds: number,
): string {
  if (bracket === "GRAND_FINAL") {
    if (round === 1 && totalRounds === 1) return "Grand final";
    return round === 1 ? "GF" : "GF reset";
  }
  if (bracket === "GRAND_RESET") return "Grand reset";
  if (bracket === "LOSERS") return losersRoundLabel(round, totalRounds);
  return roundLabel(round, totalRounds);
}
