import type { LeagueState } from "@prisma/client";

type LeagueShape = {
  state: LeagueState;
};

export function canPublishLeague(league: LeagueShape): boolean {
  return league.state === "DRAFT";
}

export function canCancelLeague(league: LeagueShape): boolean {
  return (
    league.state === "DRAFT" ||
    league.state === "OPEN" ||
    league.state === "IN_PROGRESS"
  );
}

export function canStartLeague(league: LeagueShape): boolean {
  return league.state === "OPEN";
}
