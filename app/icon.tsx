// Dynamic favicon — minimal bracket mark on the dark tile.
// Generated at build time via Next.js's app/icon convention.

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="5" height="5" rx="1" fill="#A78BFA" />
          <rect
            x="2"
            y="16"
            width="5"
            height="5"
            rx="1"
            fill="#A78BFA"
            fillOpacity="0.55"
          />
          <path
            d="M7 5.5 H11 V12 H15"
            stroke="#A78BFA"
            strokeWidth="1.4"
            fill="none"
          />
          <path
            d="M7 18.5 H11 V12"
            stroke="#A78BFA"
            strokeWidth="1.4"
            fill="none"
            strokeOpacity="0.5"
          />
          <rect x="15" y="9.5" width="7" height="5" rx="1" fill="#22C55E" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
