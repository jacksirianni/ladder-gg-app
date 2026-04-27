import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#8b5cf6",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "ui-sans-serif, system-ui, -apple-system",
          letterSpacing: "-0.05em",
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
