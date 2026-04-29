/**
 * Pure helpers for league / match recap formatting. No Prisma imports here
 * so this can be used from server components, server actions, and OG image
 * routes alike.
 */

type RecapMatchLite = {
  status: string;
  disputedAt: Date | string | null;
  round: number;
};

type RecapLeagueLite = {
  name: string;
  slug: string;
  game: string;
  matches: RecapMatchLite[];
  teamsCount: number;
};

export function computeRecapStats(league: RecapLeagueLite) {
  const matchesPlayed = league.matches.filter(
    (m) => m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED",
  ).length;
  const disputesCount = league.matches.filter(
    (m) => m.disputedAt !== null,
  ).length;
  return {
    teams: league.teamsCount,
    matchesPlayed,
    disputesCount,
  };
}

/**
 * Friendly one-paragraph recap message captains can paste into a group
 * chat. No payout / wager language — sticks to what happened on the
 * bracket.
 */
export function formatRecapMessage(args: {
  leagueName: string;
  championName: string | null;
  runnerUpName: string | null;
  finalScoreText: string | null;
  teams: number;
  matchesPlayed: number;
  disputesCount: number;
  publicUrl: string;
}): string {
  const {
    leagueName,
    championName,
    runnerUpName,
    finalScoreText,
    teams,
    matchesPlayed,
    disputesCount,
    publicUrl,
  } = args;

  const championLine = championName
    ? `🏆 ${championName} won ${leagueName}`
    : `${leagueName} wrapped up`;
  const finalLine =
    runnerUpName && finalScoreText
      ? ` (${finalScoreText} over ${runnerUpName} in the final)`
      : runnerUpName
        ? ` over ${runnerUpName} in the final`
        : "";

  const statsLine = `${teams} teams · ${matchesPlayed} match${
    matchesPlayed === 1 ? "" : "es"
  } · ${disputesCount} dispute${disputesCount === 1 ? "" : "s"}`;

  return [
    `${championLine}${finalLine}.`,
    statsLine,
    publicUrl,
  ].join("\n");
}

/**
 * Friendly per-match share message. Used on the match share page's
 * copy-button.
 */
export function formatMatchShareMessage(args: {
  leagueName: string;
  round: number;
  bracketPosition: number;
  teamAName: string;
  teamBName: string;
  winnerName: string | null;
  scoreText: string | null;
  publicUrl: string;
}): string {
  const {
    leagueName,
    round,
    bracketPosition,
    teamAName,
    teamBName,
    winnerName,
    scoreText,
    publicUrl,
  } = args;

  const headline = winnerName
    ? scoreText
      ? `${winnerName} ${scoreText} ${
          winnerName === teamAName ? teamBName : teamAName
        }`
      : `${winnerName} beat ${
          winnerName === teamAName ? teamBName : teamAName
        }`
    : `${teamAName} vs ${teamBName}`;

  return [
    headline,
    `${leagueName} · R${round} M${bracketPosition}`,
    publicUrl,
  ].join("\n");
}
