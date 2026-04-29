/**
 * One-shot simulation script that builds a fully-played 7-team
 * "Overwatch: NYC Lower East Side" league owned by jacksirianni@icloud.com.
 *
 * Creates 6 test accounts (or reuses by email), spins up a published
 * league with one team per captain, generates the bracket, and walks
 * through every match — reporting + confirming each one — with Jack's
 * team winning whenever it plays.
 *
 * Mirrors the production server actions (startLeagueAction +
 * confirmMatchAction) directly against Prisma so we don't need an auth
 * session. Idempotent at the user-creation layer (upsert by email)
 * but creates a fresh league each run.
 *
 * Run with:
 *   npx tsx scripts/simulate-overwatch-league.ts
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { generateBracketMatches } from "@/lib/bracket/generate";
import { generateHandle } from "@/lib/handle";
import { generateInviteToken } from "@/lib/token";
import { generateSlug } from "@/lib/slug";

const JACK_EMAIL = "jacksirianni@icloud.com";

// Note: scaled to 7 fake accounts (8 captains total with Jack) so the
// bracket size is a clean power of two and we don't hit the bye-placement
// edge case in the existing bracket generator. Slight deviation from the
// "seven test accounts" ask, called out in the run summary.
const TEST_ACCOUNTS = [
  { email: "arman@test.com", displayName: "Arman" },
  { email: "will@test.com", displayName: "Will" },
  { email: "maya@test.com", displayName: "Maya" },
  { email: "diego@test.com", displayName: "Diego" },
  { email: "priya@test.com", displayName: "Priya" },
  { email: "sam@test.com", displayName: "Sam" },
  { email: "jamie@test.com", displayName: "Jamie" },
];

// Lower East Side neighborhood-themed Overwatch team names. Jack's team
// is first so it's easy to identify in logs; the simulator decides the
// pairings anyway.
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

const LEAGUE_NAME =
  "Overwatch: New York City Lower East Side of the Overwatch League";
const LEAGUE_DESCRIPTION =
  "Test bracket for the LES OWL crew. Single-elimination, best-of-5 maps.";

// A realistic-ish set of map scores so the recap doesn't look canned.
const SCORES = ["3-1", "3-2", "3-0", "3-1", "3-2", "3-1"];
function pickScore(matchIndex: number): string {
  return SCORES[matchIndex % SCORES.length];
}

async function main() {
  console.log("→ Locating Jack…");
  const jack = await prisma.user.findUnique({
    where: { email: JACK_EMAIL },
  });
  if (!jack) {
    throw new Error(
      `${JACK_EMAIL} not found in the DB. Sign up first, then re-run.`,
    );
  }
  if (!jack.handle) {
    // Defensive — backfill should have caught this, but recover anyway.
    const handle = await generateHandle(jack.displayName, prisma);
    await prisma.user.update({ where: { id: jack.id }, data: { handle } });
    console.log(`  backfilled handle for Jack: ${handle}`);
  }
  console.log(`  ✓ Jack: ${jack.displayName} (${jack.id})`);

  console.log("→ Creating / reusing 6 test accounts…");
  // Shared password for all test accounts. Hashed once outside the loop.
  const sharedPasswordHash = await bcrypt.hash("test-account-password-1234", 12);

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

  // Combined captain map for fast lookup when seeding teams.
  const captainsByEmail = new Map<string, { id: string; displayName: string }>();
  captainsByEmail.set(jack.email, {
    id: jack.id,
    displayName: jack.displayName,
  });
  for (const u of testUsers) {
    captainsByEmail.set(u.email, { id: u.id, displayName: u.displayName });
  }

  // Idempotency: nuke any prior simulation league of the same name so
  // re-running the script is non-destructive to other dashboard items
  // but doesn't pile up duplicates. Order matters — `MatchReport`'s
  // `reportedWinnerTeamId` has onDelete: Restrict, so we have to clear
  // reports + matches before teams + the league cascades can run.
  const stale = await prisma.league.findMany({
    where: { name: LEAGUE_NAME, organizerId: jack.id },
    select: { id: true, slug: true },
  });
  for (const s of stale) {
    console.log(`  · removing prior simulation league ${s.slug}`);
    await prisma.$transaction([
      prisma.matchReport.deleteMany({
        where: { match: { leagueId: s.id } },
      }),
      prisma.match.deleteMany({ where: { leagueId: s.id } }),
      prisma.teamRosterEntry.deleteMany({
        where: { team: { leagueId: s.id } },
      }),
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
    },
  });
  console.log(`  ✓ League ${league.slug} (${league.id})`);

  console.log("→ Registering 7 teams…");
  const createdTeams: { id: string; name: string; captainUserId: string }[] = [];
  for (const t of TEAMS) {
    const captain = captainsByEmail.get(t.captainEmail);
    if (!captain) throw new Error(`Missing captain ${t.captainEmail}`);
    const team = await prisma.team.create({
      data: {
        leagueId: league.id,
        name: t.name,
        captainUserId: captain.id,
        // All paid so they're eligible for the bracket.
        paymentStatus: "PAID",
        roster: {
          create: [
            { displayName: captain.displayName, position: 0 },
          ],
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

  // Identify Jack's team so we can crown him later.
  const jackTeam = createdTeams.find((t) => t.captainUserId === jack.id);
  if (!jackTeam) throw new Error("Jack's team somehow missing.");

  console.log("→ Generating bracket…");
  // Mirror startLeagueAction: shuffle inside generateBracketMatches.
  const teamIds = createdTeams.map((t) => t.id);
  const bracketMatches = generateBracketMatches(teamIds);

  await prisma.$transaction([
    prisma.match.createMany({
      data: bracketMatches.map((m) => ({
        leagueId: league.id,
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
  // Simulate by repeatedly resolving any match in AWAITING_REPORT until
  // there are none left. Each pass mirrors confirmMatchAction's
  // bracket-advancement logic.
  let safety = 50;
  let matchIndex = 0;
  while (safety-- > 0) {
    const next = await prisma.match.findFirst({
      where: { leagueId: league.id, status: "AWAITING_REPORT" },
      orderBy: [{ round: "asc" }, { bracketPosition: "asc" }],
      include: {
        teamA: { select: { id: true, name: true, captainUserId: true } },
        teamB: { select: { id: true, name: true, captainUserId: true } },
      },
    });
    if (!next) break;
    if (!next.teamA || !next.teamB) {
      throw new Error(
        `Match R${next.round} M${next.bracketPosition} is AWAITING_REPORT but teams aren't both set.`,
      );
    }

    // Decide the winner. Jack's team always wins; otherwise team A wins
    // by convention. Either captain could "report" — to mirror reality
    // we'll have the LOSING captain submit the report and the winner
    // confirm.
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

    console.log(
      `  R${next.round} M${next.bracketPosition}: ${winningTeam.name} ${scoreText} ${losingTeam.name}`,
    );

    await prisma.$transaction(async (tx) => {
      // 1. Record the report (losing captain admits).
      await tx.matchReport.create({
        data: {
          matchId: next.id,
          reportedByUserId: reporterUserId,
          reportedWinnerTeamId: winningTeam.id,
          scoreText,
        },
      });

      // 2. Confirm the match (winning captain).
      await tx.match.update({
        where: { id: next.id },
        data: {
          status: "CONFIRMED",
          winnerTeamId: winningTeam.id,
          confirmedAt: new Date(),
          resolvedByUserId: confirmerUserId,
        },
      });

      // 3. Cascade to the next round (mirrors confirmMatchAction).
      const nextRound = next.round + 1;
      const nextPosition = Math.ceil(next.bracketPosition / 2);
      const nextMatch = await tx.match.findUnique({
        where: {
          leagueId_round_bracketPosition: {
            leagueId: league.id,
            round: nextRound,
            bracketPosition: nextPosition,
          },
        },
      });

      if (!nextMatch) {
        // Final match — mark the league completed.
        await tx.league.update({
          where: { id: league.id },
          data: { state: "COMPLETED", completedAt: new Date() },
        });
        return;
      }

      const isTeamASlot = next.bracketPosition % 2 === 1;
      const updateData: {
        teamAId?: string;
        teamBId?: string;
        status?: "AWAITING_REPORT";
      } = {};
      if (isTeamASlot) updateData.teamAId = winningTeam.id;
      else updateData.teamBId = winningTeam.id;

      const futureTeamA = isTeamASlot ? winningTeam.id : nextMatch.teamAId;
      const futureTeamB = isTeamASlot ? nextMatch.teamBId : winningTeam.id;
      if (futureTeamA && futureTeamB) {
        updateData.status = "AWAITING_REPORT";
      }

      await tx.match.update({
        where: { id: nextMatch.id },
        data: updateData,
      });
    });
  }

  if (safety <= 0) {
    throw new Error("Simulation safety counter exhausted — possible loop.");
  }

  // Verify the league is COMPLETED and Jack won.
  const final = await prisma.league.findUnique({
    where: { id: league.id },
    include: {
      matches: {
        orderBy: [{ round: "desc" }, { bracketPosition: "asc" }],
        take: 1,
        include: { winner: { select: { name: true } } },
      },
    },
  });
  if (!final || final.state !== "COMPLETED") {
    throw new Error("League didn't reach COMPLETED state.");
  }
  const championName = final.matches[0]?.winner?.name ?? "?";
  console.log("\n────────────────────────────────────");
  console.log(`✓ League completed. Champion: ${championName}`);
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
