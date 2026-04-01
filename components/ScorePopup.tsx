"use client";
import { motion } from "motion/react";

interface ScorePopupProps {
  score: number;
  x: number;
  y: number;
  combo?: number;
  onDone: () => void;
}

export default function ScorePopup({ score, x, y, combo = 1, onDone }: ScorePopupProps) {
  const color = combo >= 10 ? "#FF4444" : combo >= 5 ? "#FF8C00" : combo >= 3 ? "#FFD700" : "#FFFFFF";
  return (
    <motion.div
      className="fixed pointer-events-none z-50 font-black text-xl"
      style={{ left: x, top: y, color, textShadow: `0 0 12px ${color}88, 1px 1px 0 rgba(0,0,0,0.5)` }}
      initial={{ opacity: 1, scale: 0.5, y: 0 }}
      animate={{ opacity: 0, scale: 1.2, y: -60 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      onAnimationComplete={onDone}
    >
      +{score.toLocaleString()}
    </motion.div>
  );
}
