/**
 * One-shot simulation script that builds a fully-played
 * "Overwatch: NYC Lower East Side" league owned by jacksirianni@icloud.com.
 *
 * Creates 6+ test accounts (or reuses by email), spins up a published
 * league with one team per captain, generates the bracket, and walks
 * through every match — reporting + confirming each one — with Jack's
 * team winning whenever it plays.
 *
 * v2.0: now uses `applyMatchCascade` from `lib/bracket/apply-cascade.ts`
 * — the same code path the real confirmMatchAction uses. This is the
 * primary correctness check for the DE cascade.
 *
 * Run with:
 *   npx tsx scripts/simulate-overwatch-league.ts            # SE, 8 teams
 *   FORMAT=DOUBLE_ELIM npx tsx scripts/simulate-overwatch-league.ts
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import {
  applyMatchCascade,
  computeBracketSize,
} from "@/lib/bracket/apply-cascade";
import { generateBracketMatches } from "@/lib/bracket/generate";
import { generateHandle } from "@/lib/handle";
import { generateInviteToken } from "@/lib/token";
import { generateSlug } from "@/lib/slug";

const JACK_EMAIL = "jacksirianni@icloud.com";

const TEST_ACCOUNTS = [
  { email: "arman@test.com", displayName: "Arman" },
  { email: "will@test.com", displayName: "Will" },
  { email: "maya@test.com", displayName: "Maya" },
  { email: "diego@test.com", displayName: "Diego" },
  { email: "priya@test.com", displayName: "Priya" },
  { email: "sam@test.com", displayName: "Sam" },
  { email: "jamie@test.com", displayName: "Jamie" },
];

const TEAMS = [
  { captainEmail: JACK_EMAIL, name: "Lower East Lions" },
  { captainEmail: "arman@test.com", name: "Bowery Bastions" },
  { captainEmail: "will@test.com", name: "Delancey Defenders" },
  { captainEmail: "maya@test.com", name: "Tompkins Titans" },
  { captainEmail: "diego@test.com", name: "Allen Street Aces" },
  { captainEmail: "priya@test.com", name: "Forsyth Phoenixes" },
  { captainEmail: "sam@test.com", name: "Orchard Outlaws" },
  { captainEmail: "jamie@test.com", name: "Houston Hellions" },
];

const FORMAT = (process.env.FORMAT as "SINGLE_ELIM" | "DOUBLE_ELIM") ?? "SINGLE_ELIM";
const ALLOW_BRACKET_RESET = process.env.ALLOW_RESET !== "0";

const LEAGUE_NAME =
  FORMAT === "DOUBLE_ELIM"
    ? "Overwatch: LES OWL — Double Elimination"
    : "Overwatch: New York City Lower East Side of the Overwatch League";
const LEAGUE_DESCRIPTION =
  FORMAT === "DOUBLE_ELIM"
    ? "DE test bracket — winners + losers brackets, optional grand-final reset."
    : "Test bracket for the LES OWL crew. Single-elimination, best-of-5 maps.";

const SCORES = ["3-1", "3-2", "3-0", "3-1", "3-2", "3-1"];
function pickScore(matchIndex: number): string {
  return SCORES[matchIndex % SCORES.length];
}

async function main() {
  console.log(`→ Format: ${FORMAT}${FORMAT === "DOUBLE_ELIM" ? ` (allowBracketReset=${ALLOW_BRACKET_RESET})` : ""}`);
  console.log("→ Locating Jack…");
  const jack = await prisma.user.findUnique({ where: { email: JACK_EMAIL } });
  if (!jack) {
    throw new Error(
      `${JACK_EMAIL} not found in the DB. Sign up first, then re-run.`,
    );
  }
  if (!jack.handle) {
    const handle = await generateHandle(jack.displayName, prisma);
    await prisma.user.update({ where: { id: jack.id }, data: { handle } });
    console.log(`  backfilled handle for Jack: ${handle}`);
  }
  console.log(`  ✓ Jack: ${jack.displayName} (${jack.id})`);

  console.log("→ Creating / reusing 7 test accounts…");
  const sharedPasswordHash = await bcrypt.hash(
    "test-account-password-1234",
    12,
  );

  const testUsers: { email: string; id: string; displayName: string }[] = [];
  for (const acct of TEST_ACCOUNTS) {
    const existing = await prisma.user.findUnique({
      where: { email: acct.email },
    });
    if (existing) {
      console.log(`  · reusing ${acct.email}`);
      testUsers.push({
        email: existing.email,
        id: existing.id,
        displayName: existing.displayName,
      });
      continue;
    }
    const u = await prisma.$transaction(async (tx) => {
      const handle = await generateHandle(acct.displayName, tx);
      return tx.user.create({
        data: {
          email: acct.email,
          displayName: acct.displayName,
          handle,
          passwordHash: sharedPasswordHash,
          ageConfirmed: true,
        },
      });
    });
    console.log(`  + created ${u.email} (${u.handle})`);
    testUsers.push({
      email: u.email,
      id: u.id,
      displayName: u.displayName,
    });
  }

  const captainsByEmail = new Map<string, { id: string; displayName: string }>();
  captainsByEmail.set(jack.email, {
    id: jack.id,
    displayName: jack.displayName,
  });
  for (const u of testUsers) {
    captainsByEmail.set(u.email, { id: u.id, displayName: u.displayName });
  }

  // Idempotency: nuke any prior simulation league of the same name.
  const stale = await prisma.league.findMany({
    where: { name: LEAGUE_NAME, organizerId: jack.id },
    select: { id: true, slug: true },
  });
  for (const s of stale) {
    console.log(`  · removing prior simulation league ${s.slug}`);
    await prisma.$transaction([
      prisma.matchReport.deleteMany({ where: { match: { leagueId: s.id } } }),
      prisma.matchEvidence.deleteMany({ where: { match: { leagueId: s.id } } }),
      prisma.match.deleteMany({ where: { leagueId: s.id } }),
      prisma.teamRosterEntry.deleteMany({ where: { team: { leagueId: s.id } } }),
      prisma.team.deleteMany({ where: { leagueId: s.id } }),
      prisma.league.delete({ where: { id: s.id } }),
    ]);
  }

  console.log("→ Creating league…");
  const slug = generateSlug(LEAGUE_NAME);
  const league = await prisma.league.create({
    data: {
      name: LEAGUE_NAME,
      description: LEAGUE_DESCRIPTION,
      game: "Overwatch 2",
      teamSize: 1,
      maxTeams: 8,
      buyInCents: 0,
      payoutPreset: "WTA",
      slug,
      inviteToken: generateInviteToken(),
      organizerId: jack.id,
      visibility: "OPEN_JOIN",
      lookingForTeams: false,
      state: "OPEN",
      publishedAt: new Date(),
      // v2.0
      format: FORMAT,
      allowBracketReset: FORMAT === "DOUBLE_ELIM" ? ALLOW_BRACKET_RESET : false,
      // v1.7 + v1.9: BO3 default + BO5 final for the OW2 preset
      matchFormat: "BEST_OF_3",
      finalMatchFormat: "BEST_OF_5",
    },
  });
  console.log(`  ✓ League ${league.slug} (${league.id})`);

  console.log("→ Registering 8 teams…");
  const createdTeams: { id: string; name: string; captainUserId: string }[] = [];
  for (const t of TEAMS) {
    const captain = captainsByEmail.get(t.captainEmail);
    if (!captain) throw new Error(`Missing captain ${t.captainEmail}`);
    const team = await prisma.team.create({
      data: {
        leagueId: league.id,
        name: t.name,
        captainUserId: captain.id,
        paymentStatus: "PAID",
        roster: {
          create: [{ displayName: captain.displayName, position: 0 }],
        },
      },
    });
    console.log(`  + ${team.name} — captain ${captain.displayName}`);
    createdTeams.push({
      id: team.id,
      name: team.name,
      captainUserId: captain.id,
    });
  }

  console.log("→ Generating bracket…");
  const teamIds = createdTeams.map((t) => t.id);
  const bracketMatches = generateBracketMatches(teamIds, FORMAT, {
    allowBracketReset: ALLOW_BRACKET_RESET,
  });

  await prisma.$transaction([
    prisma.match.createMany({
      data: bracketMatches.map((m) => ({
        leagueId: league.id,
        bracket: m.bracket,
        round: m.round,
        bracketPosition: m.bracketPosition,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        status: m.teamAId && m.teamBId ? "AWAITING_REPORT" : "PENDING",
      })),
    }),
    prisma.league.update({
      where: { id: league.id },
      data: { state: "IN_PROGRESS", startedAt: new Date() },
    }),
  ]);
  console.log(`  ✓ ${bracketMatches.length} matches, league IN_PROGRESS`);

  console.log("→ Simulating matches…");
  // Resolve any AWAITING_REPORT match repeatedly. Each pass calls the
  // production cascade helper so the simulation exercises the same
  // code path as confirmMatchAction.
  let safety = 100;
  let matchIndex = 0;
  const bracketSize = computeBracketSize(createdTeams.length, FORMAT);

  while (safety-- > 0) {
    const next = await prisma.match.findFirst({
      where: { leagueId: league.id, status: "AWAITING_REPORT" },
      orderBy: [{ bracket: "asc" }, { round: "asc" }, { bracketPosition: "asc" }],
      include: {
        teamA: { select: { id: true, name: true, captainUserId: true } },
        teamB: { select: { id: true, name: true, captainUserId: true } },
      },
    });
    if (!next) break;
    if (!next.teamA || !next.teamB) {
      throw new Error(
        `Match ${next.bracket} R${next.round} M${next.bracketPosition} is AWAITING_REPORT but teams aren't both set.`,
      );
    }

    // Pick the winner — Jack always wins when in the match.
    const jackInMatch =
      next.teamA.captainUserId === jack.id ||
      next.teamB.captainUserId === jack.id;
    const winningTeam = jackInMatch
      ? next.teamA.captainUserId === jack.id
        ? next.teamA
        : next.teamB
      : next.teamA;
    const losingTeam =
      winningTeam.id === next.teamA.id ? next.teamB : next.teamA;

    const reporterUserId = losingTeam.captainUserId;
    const confirmerUserId = winningTeam.captainUserId;
    const scoreText = pickScore(matchIndex++);
    const label =
      next.bracket === "GRAND_FINAL"
        ? "Grand final"
        : next.bracket === "GRAND_RESET"
          ? "Grand reset"
          : next.bracket === "LOSERS"
            ? `LB R${next.round} M${next.bracketPosition}`
            : `WB R${next.round} M${next.bracketPosition}`;
    console.log(
      `  ${label}: ${winningTeam.name} ${scoreText} ${losingTeam.name}`,
    );

    await prisma.$transaction(async (tx) => {
      await tx.matchReport.create({
        data: {
          matchId: next.id,
          reportedByUserId: reporterUserId,
          reportedWinnerTeamId: winningTeam.id,
          scoreText,
        },
      });
      await tx.match.update({
        where: { id: next.id },
        data: {
          status: "CONFIRMED",
          winnerTeamId: winningTeam.id,
          confirmedAt: new Date(),
          resolvedByUserId: confirmerUserId,
        },
      });
      // v2.0: production cascade.
      await applyMatchCascade(tx, {
        leagueId: league.id,
        leagueFormat: FORMAT,
        allowBracketReset: ALLOW_BRACKET_RESET,
        bracketSize,
        match: {
          id: next.id,
          bracket: next.bracket,
          round: next.round,
          bracketPosition: next.bracketPosition,
          teamAId: next.teamAId,
          teamBId: next.teamBId,
          winnerTeamId: winningTeam.id,
        },
      });
    });
  }

  if (safety <= 0) {
    throw new Error("Simulation safety counter exhausted — possible loop.");
  }

  // Verify completion. For DE, prefer GRAND_RESET if it ran, then GRAND_FINAL,
  // otherwise highest-round WB winner.
  const final = await prisma.league.findUnique({
    where: { id: league.id },
    include: {
      matches: {
        orderBy: [{ round: "desc" }, { bracketPosition: "asc" }],
        include: { winner: { select: { name: true } } },
      },
    },
  });
  if (!final || final.state !== "COMPLETED") {
    throw new Error("League didn't reach COMPLETED state.");
  }
  let championName: string | undefined;
  if (FORMAT === "DOUBLE_ELIM") {
    const reset = final.matches.find(
      (m) =>
        m.bracket === "GRAND_RESET" &&
        (m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED"),
    );
    const grand = final.matches.find(
      (m) =>
        m.bracket === "GRAND_FINAL" &&
        (m.status === "CONFIRMED" || m.status === "ORGANIZER_DECIDED"),
    );
    championName = (reset ?? grand)?.winner?.name;
  } else {
    championName = final.matches[0]?.winner?.name;
  }
  console.log("\n────────────────────────────────────");
  console.log(`✓ League completed. Champion: ${championName ?? "?"}`);
  console.log(`  Public:    /leagues/${league.slug}`);
  console.log(`  Manage:    /leagues/${league.slug}/manage`);
  console.log(`  Recap:     /leagues/${league.slug}/recap`);
  console.log("────────────────────────────────────");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
