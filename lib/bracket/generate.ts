/**
 * Single-elimination bracket generator with random seeding and automatic byes.
 *
 * Returns the full set of Match rows (round, position, teamA/B) needed to
 * represent the bracket. Total matches = N - 1 where N is team count.
 *
 * Bye placement (v1.8 — fixed): bye teams are placed in the *last* slots
 * of round 2, after all the slots reserved for round-1 winners. The
 * cascade in `confirmMatchAction` always advances R1 winners into R2 in
 * position order (R1 M1 winner → R2 slot 0, R1 M2 → slot 1, …) so bye
 * teams must occupy the slots R1 winners never touch — i.e. the tail of
 * round 2. Earlier (pre-v1.8) implementations interleaved byes at even
 * slots and silently overwrote them when R1 winners cascaded in.
 */

export type GeneratedMatch = {
  round: number;
  bracketPosition: number;
  teamAId: string | null;
  teamBId: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateBracketMatches(teamIds: string[]): GeneratedMatch[] {
  const N = teamIds.length;
  if (N < 2) {
    throw new Error("Need at least 2 teams to generate a bracket.");
  }

  const shuffled = shuffle(teamIds);
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(N)));
  const byes = bracketSize - N;
  const totalRounds = Math.log2(bracketSize);

  const matches: GeneratedMatch[] = [];

  // Round 1: bottom (N - byes) shuffled teams play.
  const r1Teams = shuffled.slice(byes);
  const r1MatchCount = r1Teams.length / 2;
  for (let i = 0; i < r1MatchCount; i++) {
    matches.push({
      round: 1,
      bracketPosition: i + 1,
      teamAId: r1Teams[2 * i],
      teamBId: r1Teams[2 * i + 1],
    });
  }

  if (totalRounds === 1) {
    // 2-team tournament: only round 1 exists.
    return matches;
  }

  // Round 2: bracketSize / 4 matches → bracketSize / 2 slots.
  // Slot layout (v1.8 fix):
  //   - First `r1MatchCount` slots are placeholders for round-1 winners,
  //     populated later by the confirm cascade in position order.
  //   - Remaining slots are filled with bye teams (top of `shuffled`).
  // This guarantees the cascade never overwrites a bye team.
  const byeTeams = shuffled.slice(0, byes);
  const r2MatchCount = bracketSize / 4;
  const r2SlotCount = r2MatchCount * 2;

  const r2Slots: (string | null)[] = [];
  for (let slot = 0; slot < r2SlotCount; slot++) {
    if (slot < r1MatchCount) {
      r2Slots.push(null);
    } else {
      const byeIdx = slot - r1MatchCount;
      r2Slots.push(byeTeams[byeIdx] ?? null);
    }
  }

  for (let i = 0; i < r2MatchCount; i++) {
    matches.push({
      round: 2,
      bracketPosition: i + 1,
      teamAId: r2Slots[2 * i],
      teamBId: r2Slots[2 * i + 1],
    });
  }

  // Rounds 3 onward: empty matches, filled in as upstream confirms.
  let prevRoundMatches = r2MatchCount;
  let round = 3;
  while (prevRoundMatches > 1) {
    const thisRoundMatches = prevRoundMatches / 2;
    for (let i = 0; i < thisRoundMatches; i++) {
      matches.push({
        round,
        bracketPosition: i + 1,
        teamAId: null,
        teamBId: null,
      });
    }
    prevRoundMatches = thisRoundMatches;
    round++;
  }

  return matches;
}
