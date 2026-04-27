import type { ComponentProps } from "react";
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

export function BracketView({ matches }: Props) {
  if (matches.length === 0) {
    return null;
  }

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

  const totalRounds = rounds[rounds.length - 1].round;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit gap-6 pb-2">
        {rounds.map(({ round, matches }) => (
          <div key={round} className="flex min-w-44 flex-col gap-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              {roundLabel(round, totalRounds)}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {matches.map((m) => (
                <BracketNode key={`${m.round}-${m.bracketPosition}`} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
