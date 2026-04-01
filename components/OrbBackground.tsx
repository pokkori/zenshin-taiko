"use client";
import React, { memo } from "react";

const ORBS = [
  { w: 200, h: 200, top: "5%",  left: "-5%",  color: "rgba(239,68,68,0.12)",  dur: 14, delay: 0 },
  { w: 150, h: 150, top: "65%", left: "72%",  color: "rgba(251,191,36,0.10)", dur: 18, delay: 3 },
  { w: 120, h: 120, top: "35%", left: "60%",  color: "rgba(239,68,68,0.08)",  dur: 12, delay: 7 },
  { w: 85,  h: 85,  top: "82%", left: "12%",  color: "rgba(249,115,22,0.08)", dur: 20, delay: 1 },
  { w: 170, h: 170, top: "20%", left: "75%",  color: "rgba(220,38,38,0.06)",  dur: 16, delay: 5 },
  { w: 95,  h: 95,  top: "72%", left: "38%",  color: "rgba(251,191,36,0.07)", dur: 11, delay: 9 },
  { w: 65,  h: 65,  top: "48%", left: "4%",   color: "rgba(249,115,22,0.06)", dur: 22, delay: 2 },
  { w: 110, h: 110, top: "88%", left: "82%",  color: "rgba(239,68,68,0.07)",  dur: 15, delay: 6 },
];

function OrbBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", overflow: "hidden",
      }}
    >
      {ORBS.map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: orb.w, height: orb.h,
            top: orb.top, left: orb.left,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            filter: "blur(32px)",
            animation: `orbFloat ${orb.dur}s ease-in-out infinite`,
            animationDelay: `${orb.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-24px) scale(1.08); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default memo(OrbBackground);
