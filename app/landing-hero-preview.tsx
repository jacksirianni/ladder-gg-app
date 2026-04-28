"use client";

import { useEffect, useState } from "react";

type BracketStatus = "pending" | "awaiting" | "confirmed" | "live";

const statusBorder: Record<BracketStatus, string> = {
  pending: "var(--border)",
  awaiting: "color-mix(in oklab, var(--warning) 40%, transparent)",
  confirmed: "color-mix(in oklab, var(--success) 40%, transparent)",
  live: "color-mix(in oklab, var(--primary) 50%, transparent)",
};

function BracketRow({
  name,
  score,
  isWinner,
}: {
  name?: string;
  score?: number;
  isWinner: boolean;
}) {
  const display = name && name.length > 0 ? name : "TBD";
  const isTbd = display === "TBD";
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2.5 text-[13px]"
      style={{
        background: isWinner
          ? "color-mix(in oklab, var(--success) 10%, transparent)"
          : "transparent",
        color: isWinner ? "var(--success)" : "var(--foreground)",
      }}
    >
      <span
        className="min-w-0 truncate"
        style={{
          fontWeight: isTbd ? 400 : 500,
          opacity: isTbd ? 0.5 : 1,
        }}
      >
        {display}
      </span>
      {score !== undefined && (
        <span
          className="font-mono text-xs font-semibold"
          style={{
            color: isWinner ? "var(--success)" : "var(--foreground-subtle)",
          }}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function BracketNode({
  teamA,
  teamB,
  scoreA,
  scoreB,
  status = "pending",
  winner,
}: {
  teamA?: string;
  teamB?: string;
  scoreA?: number;
  scoreB?: number;
  status?: BracketStatus;
  winner?: "A" | "B";
}) {
  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{
        minWidth: 180,
        border: `1px solid ${statusBorder[status]}`,
        background: "var(--surface)",
        boxShadow:
          status === "live"
            ? "0 0 0 4px color-mix(in oklab, var(--primary) 8%, transparent)"
            : "none",
        transition: "all 200ms ease",
      }}
    >
      <BracketRow name={teamA} score={scoreA} isWinner={winner === "A"} />
      <div style={{ borderTop: "1px solid var(--border)" }} />
      <BracketRow name={teamB} score={scoreB} isWinner={winner === "B"} />
    </div>
  );
}

function Eyebrow({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`font-mono text-[11px] uppercase ${className}`}
      style={{
        letterSpacing: "0.18em",
        color: "var(--foreground-subtle)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function LandingHeroPreview() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2400);
    return () => clearInterval(id);
  }, []);

  // Live match score ticks gently
  const liveScoreA = 11;
  const liveScoreB = 8 + (tick % 3);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        border: "1px solid var(--border)",
        background:
          "linear-gradient(180deg, var(--surface) 0%, color-mix(in oklab, var(--surface) 80%, var(--background)) 100%)",
      }}
    >
      {/* faux app chrome */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in oklab, var(--background) 50%, var(--surface))",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="font-mono font-semibold"
            style={{ fontSize: 13, letterSpacing: "-0.01em" }}
          >
            LADDER
            <span style={{ color: "var(--primary)" }}>.gg</span>
          </span>
          <span style={{ color: "var(--foreground-subtle)", fontSize: 12 }}>
            /
          </span>
          <span
            style={{ fontSize: 12, color: "var(--foreground-muted)" }}
          >
            Tuesday Comp Cup
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-medium uppercase"
          style={{
            background: "color-mix(in oklab, var(--primary) 10%, transparent)",
            border:
              "1px solid color-mix(in oklab, var(--primary) 30%, transparent)",
            color: "var(--primary)",
            letterSpacing: "0.08em",
          }}
        >
          In progress
        </span>
      </div>

      {/* bracket grid */}
      <div className="flex gap-5 overflow-x-auto p-5">
        <div className="flex min-w-[170px] flex-col gap-3">
          <Eyebrow>Quarterfinals</Eyebrow>
          <BracketNode
            teamA="NULL POINTERS"
            teamB="ROGUE WAVE"
            scoreA={13}
            scoreB={9}
            winner="A"
            status="confirmed"
          />
          <BracketNode
            teamA="DEADLOCK"
            teamB="HALF-LIFE"
            scoreA={11}
            scoreB={13}
            winner="B"
            status="confirmed"
          />
          <BracketNode
            teamA="LATE PEEK"
            teamB="OVERTIME"
            scoreA={13}
            scoreB={4}
            winner="A"
            status="confirmed"
          />
          <BracketNode
            teamA="LAN PARTY"
            teamB="THIRDWAVE"
            scoreA={7}
            scoreB={13}
            winner="B"
            status="confirmed"
          />
        </div>

        <div className="flex min-w-[170px] flex-col justify-around gap-6">
          <Eyebrow>Semifinals</Eyebrow>
          <BracketNode
            teamA="NULL POINTERS"
            teamB="HALF-LIFE"
            scoreA={liveScoreA}
            scoreB={liveScoreB}
            status="live"
          />
          <BracketNode
            teamA="LATE PEEK"
            teamB="THIRDWAVE"
            status="awaiting"
          />
        </div>

        <div className="flex min-w-[170px] flex-col justify-center">
          <Eyebrow style={{ marginBottom: 12 }}>Final</Eyebrow>
          <BracketNode status="pending" />
        </div>
      </div>

      {/* live status footer */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 font-mono"
        style={{
          borderTop: "1px solid var(--border)",
          background: "color-mix(in oklab, var(--background) 60%, transparent)",
          fontSize: 12,
          color: "var(--foreground-muted)",
        }}
      >
        <span className="inline-flex items-center gap-2">
          <span
            className="animate-pulse rounded-full"
            style={{
              width: 8,
              height: 8,
              background: "var(--primary)",
              boxShadow:
                "0 0 0 4px color-mix(in oklab, var(--primary) 20%, transparent)",
            }}
          />
          LIVE · NULL POINTERS vs HALF-LIFE
        </span>
        <span>8 TEAMS · BO3 · SINGLE ELIM</span>
      </div>
    </div>
  );
}
