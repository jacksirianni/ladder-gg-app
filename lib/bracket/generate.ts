/**
 * Single-elimination bracket generator with random seeding and automatic byes.
 *
 * Returns the full set of Match rows (round, position, teamA/B) needed to
 * represent the bracket. Total matches = N - 1 where N is team count.
 *
 * Bye placement: top `byes` randomly-shuffled teams skip round 1 and are
 * placed directly into round 2 slots, paired with round-1 winners when
 * available, or with each other when not. This is intentionally simpler than
 * a fully tournament-correct seed/bye placement — random shuffle covers it.
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

  // Round 1: bottom (N - byes) shuffled teams play
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

  // Round 2: bracketSize / 4 matches. Slots filled with byes (top of shuffled)
  // interleaved with placeholders for round-1 winners.
  const byeTeams = shuffled.slice(0, byes);
  const r2MatchCount = bracketSize / 4;
  const r2SlotCount = r2MatchCount * 2;

  // Slot assignment: alternate bye then placeholder. If we run out of one,
  // fall back to the other.
  const r2Slots: (string | null)[] = [];
  let byeIdx = 0;
  let placeholderCount = 0;
  for (let slot = 0; slot < r2SlotCount; slot++) {
    const wantBye = slot % 2 === 0;
    if (wantBye && byeIdx < byeTeams.length) {
      r2Slots.push(byeTeams[byeIdx++]);
    } else if (placeholderCount < r1MatchCount) {
      r2Slots.push(null);
      placeholderCount++;
    } else if (byeIdx < byeTeams.length) {
      // out of placeholders — fill remaining with byes
      r2Slots.push(byeTeams[byeIdx++]);
    } else {
      // shouldn't happen
      r2Slots.push(null);
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
