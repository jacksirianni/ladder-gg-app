"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import type { MatchBracket } from "@prisma/client";
import { BracketNode } from "@/components/bracket-node";
import { cn } from "@/lib/cn";

type Match = ComponentProps<typeof BracketNode>["match"];

type Props = {
  matches: Match[];
};

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Quarterfinal";
  return `Round ${round}`;
}

function losersRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return "Losers final";
  if (round === totalRounds - 1) return "Losers semi";
  return `Losers R${round}`;
}

/**
 * v2.0-C: bracket view now adapts to viewport.
 *   - Desktop (lg+): all sections stacked vertically (Winners / Losers
 *     / Grand final), each scrolls horizontally between rounds. Same
 *     layout as v2.0-A.
 *   - Mobile (< lg): tabs at the top — "Winners" / "Losers" / "Grand
 *     final" — only one section visible at a time. Avoids the dual-
 *     scroll-container problem.
 *
 * Single-elim leagues never see the tabs; they render the legacy
 * single-section layout regardless of viewport.
 */
export function BracketView({ matches }: Props) {
  if (matches.length === 0) {
    return null;
  }

  const wbMatches = matches.filter((m) => m.bracket === "WINNERS");
  const lbMatches = matches.filter((m) => m.bracket === "LOSERS");
  const gfMatches = matches.filter(
    (m) => m.bracket === "GRAND_FINAL" || m.bracket === "GRAND_RESET",
  );

  const isDoubleElim = lbMatches.length > 0 || gfMatches.length > 0;

  if (!isDoubleElim) {
    return <BracketColumns matches={wbMatches} />;
  }

  return <DoubleElimView wb={wbMatches} lb={lbMatches} gf={gfMatches} />;
}

function DoubleElimView({
  wb,
  lb,
  gf,
}: {
  wb: Match[];
  lb: Match[];
  gf: Match[];
}) {
  type Tab = "WINNERS" | "LOSERS" | "GRAND_FINAL";
  const [activeTab, setActiveTab] = useState<Tab>("WINNERS");

  return (
    <div>
      {/* Mobile tabs (< lg). Hidden on desktop where all sections stack. */}
      <div
        role="tablist"
        aria-label="Bracket sections"
        className="mb-4 inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1 lg:hidden"
      >
        <BracketTab
          active={activeTab === "WINNERS"}
          onClick={() => setActiveTab("WINNERS")}
        >
          Winners
        </BracketTab>
        <BracketTab
          active={activeTab === "LOSERS"}
          onClick={() => setActiveTab("LOSERS")}
        >
          Losers
        </BracketTab>
        {gf.length > 0 && (
          <BracketTab
            active={activeTab === "GRAND_FINAL"}
            onClick={() => setActiveTab("GRAND_FINAL")}
          >
            Grand final
          </BracketTab>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {/* Winners — always visible on lg+, conditional on mobile. */}
        <BracketSection
          title="Winners bracket"
          matches={wb}
          bracketKind="WINNERS"
          className={cn(activeTab !== "WINNERS" && "hidden lg:block")}
        />
        {lb.length > 0 && (
          <BracketSection
            title="Losers bracket"
            matches={lb}
            bracketKind="LOSERS"
            className={cn(activeTab !== "LOSERS" && "hidden lg:block")}
          />
        )}
        {gf.length > 0 && (
          <BracketSection
            title="Grand final"
            matches={gf}
            bracketKind="GRAND_FINAL"
            className={cn(activeTab !== "GRAND_FINAL" && "hidden lg:block")}
          />
        )}
      </div>
    </div>
  );
}

function BracketTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-surface-elevated text-foreground"
          : "text-foreground-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function BracketSection({
  title,
  matches,
  bracketKind,
  className,
}: {
  title: string;
  matches: Match[];
  bracketKind: MatchBracket;
  className?: string;
}) {
  if (matches.length === 0) return null;
  return (
    <section className={className}>
      <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-foreground-subtle">
        {title}
      </h3>
      <BracketColumns matches={matches} bracketKind={bracketKind} />
    </section>
  );
}

function BracketColumns({
  matches,
  bracketKind = "WINNERS",
}: {
  matches: Match[];
  bracketKind?: MatchBracket;
}) {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  const rounds = [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, ms]) => ({
      round,
      matches: ms.sort((a, b) => a.bracketPosition - b.bracketPosition),
    }));

  if (rounds.length === 0) return null;

  const totalRounds = rounds[rounds.length - 1].round;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit gap-6 pb-2">
        {rounds.map(({ round, matches }) => (
          <div key={round} className="flex min-w-44 flex-col gap-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-foreground-subtle">
              {labelForRound(bracketKind, round, totalRounds)}
            </h4>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {matches.map((m) => (
                <BracketNode
                  key={`${m.bracket}-${m.round}-${m.bracketPosition}`}
                  match={m}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function labelForRound(
  bracket: MatchBracket,
  round: number,
  totalRounds: number,
): string {
  if (bracket === "GRAND_FINAL") {
    if (round === 1 && totalRounds === 1) return "Grand final";
    return round === 1 ? "GF" : "GF reset";
  }
  if (bracket === "GRAND_RESET") return "Grand reset";
  if (bracket === "LOSERS") return losersRoundLabel(round, totalRounds);
  return roundLabel(round, totalRounds);
}
