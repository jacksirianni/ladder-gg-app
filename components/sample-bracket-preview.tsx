type Props = {
  /** Max-teams setting from the league. Determines how many slots the
   * sample bracket renders. Anything below 2 returns null. */
  maxTeams: number;
  /** Number of teams that have actually registered so far. The first N
   * slots are highlighted as "filled". */
  filledTeams?: number;
  /** Optional className for the wrapping div. */
  className?: string;
};

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quarterfinal";
  return `Round ${round}`;
}

/**
 * A read-only, non-interactive sketch of what the bracket will look like.
 * Shown on OPEN leagues so viewers and captains can picture the format
 * before any matches exist. Uses placeholder team labels ("Team 1" etc.)
 * and grays everything out so it's clearly a preview, not real data.
 *
 * The first `filledTeams` slots are rendered slightly brighter to give a
 * sense of "X of Y filled".
 */
export function SampleBracketPreview({
  maxTeams,
  filledTeams = 0,
  className,
}: Props) {
  if (maxTeams < 2) return null;

  // Round-1 slot count must be a power of two >= maxTeams. Byes fill any gap.
  const round1Slots = Math.pow(2, Math.ceil(Math.log2(maxTeams)));
  const totalRounds = Math.ceil(Math.log2(round1Slots));

  // Build round shapes: round 1 has `round1Slots` slots, halves each round.
  const rounds: { round: number; slots: number }[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    rounds.push({
      round: r,
      slots: round1Slots / Math.pow(2, r - 1),
    });
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <div className="flex min-w-fit gap-6 pb-2">
          {rounds.map(({ round, slots }) => (
            <div key={round} className="flex min-w-40 flex-col gap-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                {roundLabel(round, totalRounds)}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {Array.from({ length: slots / 2 }).map((_, i) => {
                  // For round 1, slot indices map to seeds 1..N. Higher rounds
                  // are pure placeholders.
                  const aSeed = round === 1 ? i * 2 + 1 : null;
                  const bSeed = round === 1 ? i * 2 + 2 : null;
                  const aFilled = aSeed !== null && aSeed <= filledTeams;
                  const bFilled =
                    bSeed !== null && bSeed <= filledTeams;
                  const aIsBye = aSeed !== null && aSeed > maxTeams;
                  const bIsBye = bSeed !== null && bSeed > maxTeams;
                  return (
                    <div
                      key={i}
                      className="rounded-md border border-dashed border-border bg-surface/40 px-3 py-2"
                      aria-hidden
                    >
                      <SampleSlot
                        label={
                          aIsBye
                            ? "Bye"
                            : aSeed !== null
                              ? `Team ${aSeed}`
                              : "—"
                        }
                        filled={aFilled}
                        bye={aIsBye}
                      />
                      <SampleSlot
                        label={
                          bIsBye
                            ? "Bye"
                            : bSeed !== null
                              ? `Team ${bSeed}`
                              : "—"
                        }
                        filled={bFilled}
                        bye={bIsBye}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
        Preview — real bracket appears when the organizer starts the league.
      </p>
    </div>
  );
}

function SampleSlot({
  label,
  filled,
  bye,
}: {
  label: string;
  filled?: boolean;
  bye?: boolean;
}) {
  return (
    <p
      className={
        bye
          ? "py-0.5 font-mono text-xs italic text-foreground-subtle"
          : filled
            ? "py-0.5 font-mono text-xs text-foreground-muted"
            : "py-0.5 font-mono text-xs text-foreground-subtle"
      }
    >
      {label}
    </p>
  );
}
