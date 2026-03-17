import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "🥁 全身太鼓 ZENSHIN TAIKO | 体で太鼓を叩け！";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0a0500, #1a0a00, #0a0500)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 20, filter: "drop-shadow(0 0 40px rgba(239,68,68,0.7))" }}>🥁</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: "#fbbf24", marginBottom: 12, textShadow: "0 0 30px rgba(251,191,36,0.5)" }}>
          全身太鼓
        </div>
        <div style={{ fontSize: 32, color: "#fcd34d", fontWeight: 700, marginBottom: 8 }}>
          ZENSHIN TAIKO
        </div>
        <div style={{ fontSize: 24, color: "#d97706" }}>
          体全体が太鼓になる！カメラで全身を感知して演奏
        </div>
      </div>
    ),
    { ...size }
  );
}
