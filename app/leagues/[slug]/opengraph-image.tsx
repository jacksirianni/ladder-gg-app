// Per-league dynamic OG image. Auto-wired by Next.js for /leagues/[slug].
// Renders 1200x630 with the bracket mark + league name + game / team count / state.

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db/prisma";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LADDER.gg league";

const stateLabel: Record<string, string> = {
  OPEN: "Registration open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type Props = {
  params: { slug: string };
};

export default async function LeagueOG({ params }: Props) {
  const { slug } = params;

  const league = await prisma.league.findUnique({
    where: { slug },
    include: { _count: { select: { teams: true } } },
  });

  // Fallback: brand card if no league or DRAFT (matches root /opengraph-image).
  if (!league || league.state === "DRAFT") {
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
            gap: 32,
            fontFamily: "monospace",
          }}
        >
          <BracketMarkFull />
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
              marginTop: 12,
            }}
          >
            Run leagues with your crew
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const meta = `${league.game} · ${league._count.teams}/${league.maxTeams} teams · ${stateLabel[league.state] ?? league.state}`;

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
        {/* Top wordmark with mark */}
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

        {/* Center content */}
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
              color: "#A78BFA",
              letterSpacing: 6,
              textTransform: "uppercase",
              marginBottom: 24,
              fontWeight: 600,
            }}
          >
            {stateLabel[league.state] ?? league.state}
          </div>
          <div
            style={{
              fontSize: 72,
              color: "#FAFAFA",
              fontWeight: 700,
              letterSpacing: -2.5,
              lineHeight: 1.05,
              maxWidth: 1040,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {league.name}
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#A1A1AA",
              marginTop: 28,
              letterSpacing: 0.5,
            }}
          >
            {meta}
          </div>
        </div>

        {/* Footer hint */}
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
          <span>ladder.gg/l/{league.slug}</span>
          <span>Run leagues with your crew</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

// Compact mark for the OG header.
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

// Full bracket mark for the brand fallback.
function BracketMarkFull() {
  return (
    <svg width="220" height="160" viewBox="0 0 160 120" fill="none">
      <rect x="10" y="14" width="14" height="14" rx="2" fill="#A78BFA" />
      <rect
        x="10"
        y="38"
        width="14"
        height="14"
        rx="2"
        fill="#A78BFA"
        fillOpacity="0.5"
      />
      <rect x="10" y="68" width="14" height="14" rx="2" fill="#A78BFA" />
      <rect
        x="10"
        y="92"
        width="14"
        height="14"
        rx="2"
        fill="#A78BFA"
        fillOpacity="0.5"
      />
      <path
        d="M24 21 H44 V49 H64"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.6"
      />
      <path
        d="M24 45 H44 V49"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.4"
      />
      <path
        d="M24 75 H44 V73 H64"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.6"
      />
      <path
        d="M24 99 H44 V73"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.4"
      />
      <rect x="64" y="42" width="14" height="14" rx="2" fill="#A78BFA" />
      <rect
        x="64"
        y="66"
        width="14"
        height="14"
        rx="2"
        fill="#A78BFA"
        fillOpacity="0.6"
      />
      <path
        d="M78 49 H100 V61 H120"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.6"
      />
      <path
        d="M78 73 H100 V61"
        stroke="#A78BFA"
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.4"
      />
      <rect x="120" y="54" width="22" height="14" rx="2" fill="#22C55E" />
    </svg>
  );
}
