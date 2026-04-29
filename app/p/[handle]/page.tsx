import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { ExternalPlatform, LeagueState } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { Avatar } from "@/components/avatar";
import { LeagueStateBadge } from "@/components/league-state-badge";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// v1.7: human-readable labels for the linked-profile pills.
const PLATFORM_LABEL: Record<ExternalPlatform, string> = {
  BATTLENET: "Battle.net",
  TRACKER_GG: "Tracker.gg",
  STEAM: "Steam",
  RIOT_ID: "Riot ID",
  EPIC: "Epic",
  XBOX: "Xbox",
  PSN: "PSN",
  NINTENDO: "Nintendo",
  OTHER: "Other",
};

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const user = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
    select: { displayName: true, handle: true },
  });
  if (!user) return {};
  return {
    title: user.displayName,
    description: `${user.displayName}'s leagues, championships, and history on LADDER.gg.`,
  };
}

export default async function PlayerProfilePage({ params }: Props) {
  const { handle } = await params;
  const handleLower = handle.toLowerCase();

  // v1.8: if the handle has been renamed, this URL hits handleHistory.
  // Permanent-redirect to the user's current handle so old shared links
  // resolve to the right page. Only honor non-expired history rows.
  const now = new Date();
  const historic = await prisma.userHandleHistory.findUnique({
    where: { handle: handleLower },
    select: {
      expiresAt: true,
      user: { select: { handle: true } },
    },
  });
  if (
    historic &&
    historic.expiresAt.getTime() > now.getTime() &&
    historic.user.handle &&
    historic.user.handle !== handleLower
  ) {
    permanentRedirect(`/p/${historic.user.handle}`);
  }

  const user = await prisma.user.findUnique({
    where: { handle: handleLower },
    include: {
      // Teams the user has captained, with each team's league + final-match
      // info so we can compute championships / runner-ups.
      captainedTeams: {
        orderBy: { createdAt: "desc" },
        include: {
          league: {
            select: {
              id: true,
              slug: true,
              name: true,
              game: true,
              state: true,
              completedAt: true,
              matches: {
                orderBy: [{ round: "desc" }, { bracketPosition: "asc" }],
                take: 1,
                select: {
                  winnerTeamId: true,
                  teamAId: true,
                  teamBId: true,
                },
              },
            },
          },
        },
      },
      // Seasons organized by this user.
      organizedSeasons: {
        select: { id: true },
      },
      // v1.7: external profile links shown publicly on the profile.
      externalProfiles: {
        orderBy: { createdAt: "asc" },
        select: {
          platform: true,
          identifier: true,
          url: true,
          label: true,
        },
      },
      // v2.0-F: awards earned across leagues. Used for MVP count + the
      // awards strip below the stats row.
      awardsReceived: {
        orderBy: { createdAt: "desc" },
        select: {
          kind: true,
          voteCount: true,
          createdAt: true,
          league: {
            select: {
              slug: true,
              name: true,
              game: true,
              completedAt: true,
            },
          },
          team: { select: { name: true } },
        },
      },
    },
  });

  if (!user) notFound();

  // Filter out DRAFT leagues — those are the organizer's private sketches
  // and shouldn't appear on a public profile.
  const publicCaptainedTeams = user.captainedTeams.filter(
    (t) => t.league.state !== "DRAFT",
  );

  // Buckets:
  //   - completedTeams: teams in COMPLETED leagues (we can compute win/loss)
  //   - cancelledTeams: still surfaced per Q2 with annotation, no W/L
  //   - activeTeams: in OPEN/IN_PROGRESS leagues
  type Bucketed = (typeof publicCaptainedTeams)[number];
  const completedTeams: Bucketed[] = [];
  const cancelledTeams: Bucketed[] = [];
  const activeTeams: Bucketed[] = [];
  for (const t of publicCaptainedTeams) {
    if (t.league.state === "COMPLETED") completedTeams.push(t);
    else if (t.league.state === "CANCELLED") cancelledTeams.push(t);
    else activeTeams.push(t);
  }

  let championships = 0;
  let runnerUps = 0;
  for (const t of completedTeams) {
    const finalMatch = t.league.matches[0];
    if (!finalMatch) continue;
    if (finalMatch.winnerTeamId === t.id) {
      championships += 1;
    } else if (
      finalMatch.winnerTeamId &&
      (finalMatch.teamAId === t.id || finalMatch.teamBId === t.id)
    ) {
      // Played in the final but didn't win → runner-up.
      runnerUps += 1;
    }
  }

  const seasonsOrganized = user.organizedSeasons.length;
  // v2.0-F: MVP wins from the awards table. Stats-row use only —
  // CHAMPION/RUNNER_UP keep using the legacy match walk above so
  // pre-v2.0-F leagues continue to count without a backfill.
  const mvpAwards = user.awardsReceived.filter((a) => a.kind === "MVP");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 md:px-12">
        {/* v2.0: avatar + bio header. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar
              src={user.avatarUrl}
              name={user.displayName}
              size="xl"
            />
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
                Player
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                {user.displayName}
              </h1>
              <p className="mt-1 font-mono text-xs text-foreground-subtle">
                @{user.handle}
              </p>
            </div>
          </div>
        </div>
        {user.bio && (
          <p className="mt-4 max-w-2xl text-sm text-foreground-muted">
            {user.bio}
          </p>
        )}

        {/* Stats row */}
        <section className="mt-8 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <ProfileStat label="Championships" value={championships} accent />
          <ProfileStat label="Runner-up" value={runnerUps} />
          {/* v2.0-F: MVP awards (voted by participants). */}
          {mvpAwards.length > 0 && (
            <ProfileStat label="MVP" value={mvpAwards.length} accent />
          )}
          <ProfileStat
            label="Completed leagues"
            value={completedTeams.length}
          />
          {seasonsOrganized > 0 && (
            <ProfileStat label="Seasons organized" value={seasonsOrganized} />
          )}
        </section>

        {/* v2.0-F: MVP awards list. Surfaced only when there are wins
            so we don't add a noisy zero-state to every profile. */}
        {mvpAwards.length > 0 && (
          <section className="mt-8">
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              MVP awards
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {mvpAwards.map((a) => (
                <li
                  key={a.league.slug}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-success/30 bg-success/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/leagues/${a.league.slug}/recap`}
                      className="block truncate text-sm font-semibold text-success hover:underline"
                    >
                      {a.league.name}
                    </Link>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-foreground-subtle">
                      {a.league.game}
                      {a.team && (
                        <>
                          <span className="px-1.5 text-foreground-subtle">
                            ·
                          </span>
                          <span className="text-foreground-muted">
                            {a.team.name}
                          </span>
                        </>
                      )}
                      {a.league.completedAt && (
                        <>
                          <span className="px-1.5 text-foreground-subtle">
                            ·
                          </span>
                          <span>
                            {a.league.completedAt.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  {a.voteCount !== null && (
                    <span className="font-mono text-[11px] uppercase tracking-wider text-success">
                      {a.voteCount}{" "}
                      {a.voteCount === 1 ? "vote" : "votes"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* v1.7: linked profiles (BattleTag, Tracker.gg, Riot ID, etc.). */}
        {user.externalProfiles.length > 0 && (
          <section className="mt-8">
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              Linked profiles
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {user.externalProfiles.map((p) => {
                const label = PLATFORM_LABEL[p.platform];
                const value = p.identifier ?? p.url ?? "";
                if (p.url) {
                  return (
                    <li key={p.platform}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-zinc-600 hover:bg-surface-elevated"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                          {label}
                        </span>
                        <span className="text-foreground-muted">↗</span>
                      </a>
                    </li>
                  );
                }
                return (
                  <li
                    key={p.platform}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                      {label}
                    </span>
                    <code className="rounded-sm bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {value}
                    </code>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {publicCaptainedTeams.length === 0 && (
          <section className="mt-12 rounded-lg border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              No leagues yet
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">
              Hasn&apos;t run any brackets yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
              Once {user.displayName} captains or wins a league, it&apos;ll
              show up here.
            </p>
          </section>
        )}

        {activeTeams.length > 0 && (
          <ProfileLeagueSection
            title="Active right now"
            teams={activeTeams}
            userTeamId={null}
          />
        )}

        {completedTeams.length > 0 && (
          <ProfileLeagueSection
            title="Past leagues"
            teams={completedTeams}
            userTeamId={null}
          />
        )}

        {cancelledTeams.length > 0 && (
          <ProfileLeagueSection
            title="Cancelled"
            teams={cancelledTeams}
            userTeamId={null}
            cancelled
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function ProfileStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${
          accent && value > 0 ? "text-success" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type ProfileLeagueRow = {
  id: string;
  name: string;
  league: {
    id: string;
    slug: string;
    name: string;
    game: string;
    state: LeagueState;
    completedAt: Date | null;
    matches: { winnerTeamId: string | null }[];
  };
};

function ProfileLeagueSection({
  title,
  teams,
  cancelled = false,
}: {
  title: string;
  teams: ProfileLeagueRow[];
  userTeamId: string | null;
  cancelled?: boolean;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        {title} ({teams.length})
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {teams.map((t) => {
          const finalMatch = t.league.matches[0];
          const won =
            t.league.state === "COMPLETED" &&
            finalMatch?.winnerTeamId === t.id;
          return (
            <li key={t.id}>
              <Link
                href={`/leagues/${t.league.slug}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <article
                  className={
                    "flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-surface px-5 py-4 transition-colors " +
                    (won
                      ? "border-success/40 hover:border-success/60"
                      : "border-border hover:border-zinc-600")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <LeagueStateBadge state={t.league.state} />
                      <span className="font-mono text-xs text-foreground-subtle">
                        {t.league.game}
                      </span>
                      {cancelled && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-warning">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold">
                      {t.league.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-foreground-muted">
                      Captained{" "}
                      <span className="text-foreground">{t.name}</span>
                      {t.league.completedAt && (
                        <>
                          <span className="px-1.5 text-foreground-subtle">
                            ·
                          </span>
                          <span>
                            {t.league.completedAt.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  {won && (
                    <span
                      className="font-mono text-xs uppercase tracking-wider text-success"
                      style={{ letterSpacing: "0.2em" }}
                    >
                      Champion
                    </span>
                  )}
                </article>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
