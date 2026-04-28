// app/opengraph-image.tsx — 1200x630 share card.
// Stacked LADDER.gg lockup over a subtle violet-to-near-black gradient.
//
// ImageResponse can't load Geist Mono from npm without explicitly fetching
// and passing the font binary; we fall back to the system mono stack which
// is fine for a marketing card.

import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LADDER.gg — Run leagues with your crew";

export default async function OG() {
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
        <svg width="220" height="160" viewBox="0 0 160 120" fill="none">
          <rect x="10" y="14" width="14" height="14" rx="2" fill="#A78BFA" />
          <rect x="10" y="38" width="14" height="14" rx="2" fill="#A78BFA" fillOpacity="0.5" />
          <rect x="10" y="68" width="14" height="14" rx="2" fill="#A78BFA" />
          <rect x="10" y="92" width="14" height="14" rx="2" fill="#A78BFA" fillOpacity="0.5" />
          <path d="M24 21 H44 V49 H64" stroke="#A78BFA" strokeWidth="2" fill="none" strokeOpacity="0.6" />
          <path d="M24 45 H44 V49" stroke="#A78BFA" strokeWidth="2" fill="none" strokeOpacity="0.4" />
          <path d="M24 75 H44 V73 H64" stroke="#A78BFA" strokeWidth="2" fill="none" strokeOpacity="0.6" />
          <path d="M24 99 H44 V73" stroke="#A78BFA" strokeWidth="2" fill="none" strokeOpacity="0.4" />
          <rect x="64" y="42" width="14" height="14" rx="2" fill="#A78BFA" />
          <rect x="64" y="66" width="14" height="14" rx="2" fill="#A78BFA" fillOpacity="0.6" />
          <path d="M78 49 H100 V61 H120" stroke="#A78BFA" strokeWidth="2" fill="none" strokeOpacity="0.6" />
          <path d="M78 73 H100 V61" stroke="#A78BFA" strokeWidth="2" fill="none" strokeOpacity="0.4" />
          <rect x="120" y="54" width="22" height="14" rx="2" fill="#22C55E" />
        </svg>
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
