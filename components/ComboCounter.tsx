"use client";
import { motion, AnimatePresence } from "motion/react";

interface ComboCounterProps {
  combo: number;
}

export default function ComboCounter({ combo }: ComboCounterProps) {
  if (combo < 2) return null;
  const isFever = combo >= 5;
  const color = combo >= 10 ? "#FF4444" : combo >= 5 ? "#FFD93D" : "#4ECDC4";
  return (
    <div className="flex flex-col items-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={combo}
          className="font-black text-center leading-none"
          style={{ fontSize: Math.min(72, 32 + combo * 4), color, textShadow: `0 0 20px ${color}99, 0 0 40px ${color}55`, WebkitTextStroke: "2px rgba(0,0,0,0.3)" }}
          initial={{ scale: 0.3, opacity: 0, y: -20 }}
          animate={{ scale: [1.4, 0.95, 1.05, 1], opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.4, times: [0, 0.4, 0.7, 1] }}
        >
          {combo}
        </motion.div>
      </AnimatePresence>
      <motion.div
        className="text-xs font-bold tracking-widest mt-0.5"
        style={{ color: `${color}CC` }}
        animate={isFever ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: isFever ? Infinity : 0 }}
      >
        {isFever ? "FEVER COMBO" : "COMBO"}
      </motion.div>
    </div>
  );
}
