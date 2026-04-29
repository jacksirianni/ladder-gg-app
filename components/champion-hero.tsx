import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProfileLink } from "@/components/profile-link";
import { duplicateLeagueAction } from "@/app/leagues/[slug]/manage/actions";

type WinnerTeam = {
  id: string;
  name: string;
  captain: { displayName: string; handle?: string | null };
  roster: { displayName: string; position: number }[];
};

type Props = {
  leagueId: string;
  /** League slug — used to link to the recap page. */
  leagueSlug: string;
  winnerTeam: WinnerTeam;
  runnerUpName: string | null;
  totalTeams: number;
  matchesPlayed: number;
  disputesCount: number;
  isOrganizer: boolean;
};

export function ChampionHero({
  leagueId,
  leagueSlug,
  winnerTeam,
  runnerUpName,
  totalTeams,
  matchesPlayed,
  disputesCount,
  isOrganizer,
}: Props) {
  return (
    <section
      className="mt-8 overflow-hidden rounded-2xl border border-success/40 bg-gradient-to-b from-success/10 via-success/5 to-transparent p-6 md:p-10"
      aria-label="League champion"
    >
      <p
        className="font-mono text-xs uppercase text-success"
        style={{ letterSpacing: "0.25em" }}
      >
        Champion
      </p>
      <h2 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-success md:text-6xl">
        {winnerTeam.name}
      </h2>
      <p className="mt-3 text-base text-foreground-muted">
        Captained by{" "}
        <ProfileLink
          handle={winnerTeam.captain.handle}
          className="text-foreground"
        >
          {winnerTeam.captain.displayName}
        </ProfileLink>
      </p>

      {winnerTeam.roster.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {winnerTeam.roster.map((entry) => (
            <li
              key={entry.position}
              className="rounded-md border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-xs text-success"
            >
              {entry.displayName}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid gap-4 border-t border-success/20 pt-6 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="Teams" value={totalTeams.toString()} />
        <Stat label="Matches" value={matchesPlayed.toString()} />
        <Stat label="Disputes" value={disputesCount.toString()} />
        <Stat label="Runner-up" value={runnerUpName ?? "—"} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/leagues/${leagueSlug}/recap`}>View full recap →</Link>
        </Button>
        {isOrganizer && (
          <>
            <span className="font-mono text-xs text-foreground-subtle">
              · or ·
            </span>
            <p className="text-sm text-foreground-muted">
              Run it again with the same setup:
            </p>
            <form action={duplicateLeagueAction}>
              <input type="hidden" name="leagueId" value={leagueId} />
              <Button type="submit" size="sm">
                Run it back →
              </Button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p
        className="font-mono text-[11px] uppercase text-foreground-subtle"
        style={{ letterSpacing: "0.16em" }}
      >
        {label}
      </p>
      <p className="mt-2 truncate text-base font-semibold md:text-lg">{value}</p>
    </div>
  );
}
