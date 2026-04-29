// Per-match dynamic OG image. Auto-wired by Next.js for
// /leagues/[slug]/matches/[matchId]. Renders a 1200x630 card highlighting
// the winner (or "vs" for in-progress matches).

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db/prisma";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LADDER.gg match";

type Props = {
  params: { slug: string; matchId: string };
};

export default async function MatchOG({ params }: Props) {
  const { slug, matchId } = params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      round: true,
      bracketPosition: true,
      status: true,
      winnerTeamId: true,
      league: { select: { slug: true, name: true, state: true, game: true } },
      teamA: { select: { id: true, name: true } },
      teamB: { select: { id: true, name: true } },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { scoreText: true },
      },
    },
  });

  // Fallback brand card if missing, slug mismatch, or DRAFT.
  if (!match || match.league.slug !== slug || match.league.state === "DRAFT") {
    return brandFallback();
  }

  const teamAName = match.teamA?.name ?? "TBD";
  const teamBName = match.teamB?.name ?? "TBD";
  const isCompleted =
    match.status === "CONFIRMED" || match.status === "ORGANIZER_DECIDED";
  const winnerName =
    match.winnerTeamId === match.teamA?.id
      ? teamAName
      : match.winnerTeamId === match.teamB?.id
        ? teamBName
        : null;
  const scoreText = match.reports[0]?.scoreText ?? null;

  const eyebrow = isCompleted
    ? "Final"
    : match.status === "DISPUTED"
      ? "Disputed"
      : match.status === "AWAITING_CONFIRM"
        ? "Awaiting confirmation"
        : match.status === "AWAITING_REPORT"
          ? "Awaiting result"
          : "Coming up";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #1a1530 0%, #09090B 60%, #09090B 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "64px 80px",
          fontFamily: "monospace",
        }}
      >
        {/* Top wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <BracketMarkSmall />
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#FAFAFA",
              fontWeight: 600,
              letterSpacing: -0.5,
            }}
          >
            <span>LADDER</span>
            <span style={{ color: "#A78BFA" }}>.gg</span>
          </div>
        </div>

        {/* Center */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: isCompleted ? "#22C55E" : "#A78BFA",
              letterSpacing: 6,
              textTransform: "uppercase",
              marginBottom: 24,
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>

          {isCompleted && winnerName ? (
            <>
              <div
                style={{
                  fontSize: 72,
                  color: "#22C55E",
                  fontWeight: 700,
                  letterSpacing: -2.5,
                  lineHeight: 1.05,
                  maxWidth: 1040,
                  display: "flex",
                  flexWrap: "wrap",
                }}
              >
                {winnerName}
              </div>
              <div
                style={{
                  fontSize: 28,
                  color: "#A1A1AA",
                  marginTop: 16,
                  letterSpacing: 0.5,
                }}
              >
                {scoreText
                  ? `${scoreText} over ${
                      winnerName === teamAName ? teamBName : teamAName
                    }`
                  : `over ${
                      winnerName === teamAName ? teamBName : teamAName
                    }`}
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 60,
                color: "#FAFAFA",
                fontWeight: 700,
                letterSpacing: -2,
                lineHeight: 1.05,
                maxWidth: 1040,
                display: "flex",
                flexWrap: "wrap",
              }}
            >
              {teamAName}{" "}
              <span style={{ color: "#71717A", margin: "0 24px" }}>vs</span>{" "}
              {teamBName}
            </div>
          )}

          <div
            style={{
              fontSize: 22,
              color: "#A1A1AA",
              marginTop: 28,
              letterSpacing: 0.5,
            }}
          >
            {match.league.name} · R{match.round} M{match.bracketPosition} ·{" "}
            {match.league.game}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 16,
            color: "#71717A",
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <span>ladder.gg</span>
          <span>Run leagues with your crew</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

function brandFallback() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #1a1530 0%, #09090B 60%, #09090B 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 84,
            color: "#FAFAFA",
            letterSpacing: -1.5,
            fontWeight: 600,
          }}
        >
          <span>LADDER</span>
          <span style={{ color: "#A78BFA" }}>.gg</span>
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#A1A1AA",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Run leagues with your crew
        </div>
      </div>
    ),
    { ...size },
  );
}

function BracketMarkSmall() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="6" y="8" width="10" height="10" rx="2" fill="#A78BFA" />
      <rect
        x="6"
        y="38"
        width="10"
        height="10"
        rx="2"
        fill="#A78BFA"
        fillOpacity="0.5"
      />
      <path
        d="M16 13 H26 V28 H36"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.7"
      />
      <path
        d="M16 43 H26 V28"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.4"
      />
      <rect x="36" y="22" width="14" height="12" rx="2" fill="#22C55E" />
    </svg>
  );
}
