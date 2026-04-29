import type { LeagueState, LeagueVisibility } from "@prisma/client";

/**
 * The minimum shape a league needs in order for `canJoinLeague` to make
 * a decision. Server-side callers are responsible for hydrating these
 * fields (and supplying `teamCount` separately when checking capacity
 * outside a transaction).
 */
export type LeagueAccessSubject = {
  state: LeagueState;
  visibility: LeagueVisibility;
  inviteToken: string;
  maxTeams: number;
  registrationClosesAt: Date | null;
};

/**
 * What the caller knows about the request. The action layer will know
 * the viewerId; the page layer might know none of this.
 */
export type LeagueAccessContext = {
  /** The current viewer's user id, or null if unauthenticated. */
  viewerId: string | null;
  /** The viewer's existing team in this league, if any. Lets us return
   *  ALREADY_REGISTERED instead of triggering a uniqueness violation. */
  viewerHasTeam: boolean;
  /** The token from the invite URL, if present. May be empty. */
  token: string;
  /** Current registered team count. The action layer should re-fetch
   *  this inside a transaction to avoid TOCTOU on capacity. */
  teamCount: number;
  /** Reference time for deadline comparison. Defaults to `new Date()`
   *  when omitted by the caller; injected for testability. */
  now?: Date;
};

/**
 * Discriminated-union result. The page uses `kind` to render copy; the
 * action uses it to decide whether to throw. Adding a new outcome here
 * means every consumer must handle it (TS will surface missing branches).
 */
export type LeagueAccessResult =
  | { kind: "ALLOW" }
  | { kind: "ALREADY_REGISTERED" }
  | { kind: "BLOCK_NEEDS_AUTH" }
  | { kind: "BLOCK_DRAFT" }
  | { kind: "BLOCK_NOT_OPEN"; state: Exclude<LeagueState, "DRAFT" | "OPEN"> }
  | { kind: "BLOCK_DEADLINE"; closesAt: Date }
  | { kind: "BLOCK_FULL"; maxTeams: number }
  | { kind: "BLOCK_NEEDS_TOKEN" }
  | { kind: "BLOCK_BAD_TOKEN" };

/**
 * Single source of truth for "is this viewer allowed to join this
 * league right now?" — used by the join page (display) AND the join
 * server action (enforcement). Adding access logic anywhere else means
 * the two paths can drift, which is exactly the bug class this helper
 * is here to prevent.
 *
 * Order of checks runs from most-specific to least-specific so the
 * returned reason matches what the user actually sees as the blocker.
 */
export function canJoinLeague(
  league: LeagueAccessSubject,
  ctx: LeagueAccessContext,
): LeagueAccessResult {
  const now = ctx.now ?? new Date();

  // 1. Lifecycle gates that don't depend on the viewer.
  if (league.state === "DRAFT") {
    return { kind: "BLOCK_DRAFT" };
  }
  if (league.state !== "OPEN") {
    return { kind: "BLOCK_NOT_OPEN", state: league.state };
  }

  // 2. Auth. Open registration still requires a signed-in user — we
  //    don't have anonymous teams.
  if (!ctx.viewerId) {
    return { kind: "BLOCK_NEEDS_AUTH" };
  }

  // 3. Already on a team in this league.
  if (ctx.viewerHasTeam) {
    return { kind: "ALREADY_REGISTERED" };
  }

  // 4. Deadline.
  if (
    league.registrationClosesAt !== null &&
    league.registrationClosesAt.getTime() <= now.getTime()
  ) {
    return { kind: "BLOCK_DEADLINE", closesAt: league.registrationClosesAt };
  }

  // 5. Capacity. Note: this is the page-level check. The action layer
  //    must re-check inside a transaction to be race-safe on the last
  //    spot — this check alone is TOCTOU-vulnerable.
  if (ctx.teamCount >= league.maxTeams) {
    return { kind: "BLOCK_FULL", maxTeams: league.maxTeams };
  }

  // 6. Token policy by visibility.
  if (league.visibility === "OPEN_JOIN") {
    // Open registration. A token in the URL is *tolerated* — if it
    // matches we trust it, if it's stale we ignore it. We never block
    // OPEN_JOIN on token shape per the v1.6 spec.
    return { kind: "ALLOW" };
  }

  // INVITE_ONLY and UNLISTED both require a valid invite token.
  if (!ctx.token) {
    return { kind: "BLOCK_NEEDS_TOKEN" };
  }
  if (ctx.token !== league.inviteToken) {
    return { kind: "BLOCK_BAD_TOKEN" };
  }
  return { kind: "ALLOW" };
}

/**
 * Whether the league should be displayed as actively recruiting.
 *
 * The organizer-toggled `lookingForTeams` boolean is a *signal*; this
 * helper layers the lifecycle gates on top so the badge only appears
 * when the league can actually accept new teams.
 */
export function shouldShowLookingForTeams(args: {
  lookingForTeams: boolean;
  state: LeagueState;
  teamCount: number;
  maxTeams: number;
  registrationClosesAt: Date | null;
  now?: Date;
}): boolean {
  if (!args.lookingForTeams) return false;
  if (args.state !== "OPEN") return false;
  if (args.teamCount >= args.maxTeams) return false;
  if (
    args.registrationClosesAt !== null &&
    args.registrationClosesAt.getTime() <= (args.now ?? new Date()).getTime()
  ) {
    return false;
  }
  return true;
}
