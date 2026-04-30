/**
 * v3.0: tiny shared helpers used across dashboard components. Lives
 * in `lib/dashboard/` so it stays out of the broader `lib/` tree
 * (these helpers are dashboard-specific, not general utilities).
 */

/**
 * Game name abbreviator for tight UI surfaces (league card top
 * right, trophy row, mini bracket). Falls back to the original
 * string when there's no canonical abbreviation — only the games
 * we frequently see get explicit shortenings.
 *
 * Heuristic for unknown games: if longer than 6 chars, take the
 * first 3 letters uppercased. Otherwise return as-is.
 */
const KNOWN_ABBREVIATIONS: Record<string, string> = {
  "rocket league": "RL",
  "counter-strike 2": "CS2",
  "counter-strike": "CS",
  "counter-strike: global offensive": "CSGO",
  csgo: "CSGO",
  "league of legends": "LoL",
  valorant: "VAL",
  overwatch: "OW",
  "overwatch 2": "OW2",
  "rainbow six siege": "R6",
  "super smash bros": "SSB",
  "super smash bros. ultimate": "SSBU",
  "street fighter 6": "SF6",
  "street fighter": "SF",
  "mortal kombat 1": "MK1",
  "mortal kombat": "MK",
  "fortnite": "FN",
  "apex legends": "APEX",
  "call of duty": "COD",
  "call of duty: warzone": "WZ",
  fifa: "FIFA",
  "fc 25": "FC25",
  "ea sports fc": "FC",
  nba2k: "2K",
  madden: "MADDEN",
  "rocket racing": "RR",
};

export function abbreviateGame(game: string): string {
  const key = game.trim().toLowerCase();
  if (KNOWN_ABBREVIATIONS[key]) return KNOWN_ABBREVIATIONS[key];
  // Unknown games: short ones pass through, longer ones get a 3-letter
  // truncation so the badge area never wraps.
  if (game.length <= 6) return game;
  return game.slice(0, 3).toUpperCase();
}
