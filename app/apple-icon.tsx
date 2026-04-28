// app/apple-icon.tsx — 180x180 home-screen icon for iOS.
// Compact bracket mark on the dark tile, no border (iOS applies the squircle).

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 56 56" fill="none">
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
      </div>
    ),
    { ...size },
  );
}
