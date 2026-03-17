"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTaikoGame } from "@/hooks/useTaikoGame";
import { BODY_PART_COLORS } from "@/lib/rhythmPatterns";
import dynamic from "next/dynamic";

const RhythmGame = dynamic(() => import("@/components/RhythmGame"), { ssr: false });

const CANVAS_W = 360;
const CANVAS_H = 560;

type Tab = "camera" | "rhythm";

export default function TaikoGame() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { phase, score, hitCount, error, isMuted, loadModel, startGame, stopGame, toggleMute } = useTaikoGame(videoRef, canvasRef);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("rhythm");

  useEffect(() => {
    const b = localStorage.getItem("taiko_best");
    if (b) setBestScore(parseInt(b));
  }, []);

  // タブ切り替え時にカメラ版が再生中なら停止
  const handleTabChange = useCallback((tab: Tab) => {
    if (tab !== "camera" && phase === "playing") {
      stopGame();
    }
    setActiveTab(tab);
  }, [phase, stopGame]);

  const handleStop = useCallback(() => {
    const prev = parseInt(localStorage.getItem("taiko_best") ?? "0");
    if (score > prev) {
      localStorage.setItem("taiko_best", String(score));
      setBestScore(score);
    }
    stopGame();
  }, [score, stopGame]);

  const shareText = `🥁 全身太鼓ZENSHINで${hitCount}回ヒット！\nスコア: ${score}点\n体で太鼓を叩いてみた！\n#全身太鼓 #ZENSHINTAIKO\nhttps://zenshin-taiko.vercel.app`;
  const shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);

  return (
    <div className="flex flex-col min-h-dvh items-center"
      style={{ background: "linear-gradient(160deg,#0a0500,#1a0a00)" }}>

      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between px-3 py-2">
        <a href="/" className="text-amber-600 text-sm">← トップ</a>
        <span className="font-black text-base" style={{ color: "#fbbf24" }}>🥁 全身太鼓</span>
        <div className="flex items-center gap-2">
          {bestScore !== null && (
            <span className="text-xs text-yellow-500">🏆{bestScore}</span>
          )}
          {activeTab === "camera" && (
            <button onClick={toggleMute} className="text-xl">{isMuted ? "🔇" : "🔊"}</button>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="w-full max-w-sm px-3 mb-2">
        <div className="flex rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => handleTabChange("rhythm")}
            className="flex-1 py-2 text-sm font-bold transition-all"
            style={{
              background: activeTab === "rhythm"
                ? "linear-gradient(135deg,#ef4444,#991b1b)"
                : "transparent",
              color: activeTab === "rhythm" ? "#fff" : "#78350f",
            }}
          >
            🎮 リズムモード
          </button>
          <button
            onClick={() => handleTabChange("camera")}
            className="flex-1 py-2 text-sm font-bold transition-all"
            style={{
              background: activeTab === "camera"
                ? "linear-gradient(135deg,#f97316,#c2410c)"
                : "transparent",
              color: activeTab === "camera" ? "#fff" : "#78350f",
            }}
          >
            📷 全身モード
          </button>
        </div>
      </div>

      {/* リズムモード */}
      {activeTab === "rhythm" && (
        <div className="w-full max-w-sm flex-1">
          <RhythmGame />
        </div>
      )}

      {/* カメラ（全身）モード */}
      {activeTab === "camera" && (
        <>
          {/* Canvas area */}
          <div className="relative w-full max-w-sm px-2">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="w-full rounded-2xl"
              style={{ maxHeight: "70dvh", objectFit: "contain", background: "#0a0500" }}
            />

            {/* Idle overlay */}
            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: "rgba(0,0,0,0.85)" }}>
                <div className="text-6xl mb-4">🥁</div>
                <h2 className="text-2xl font-black mb-2" style={{ color: "#fbbf24" }}>全身太鼓</h2>
                <p className="text-amber-300 text-sm text-center px-8 mb-6">体全体が太鼓になる！<br />カメラを許可してプレイ開始</p>
                <button onClick={loadModel}
                  className="px-10 py-3 rounded-xl font-black text-white transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#ef4444,#991b1b)", boxShadow: "0 0 20px rgba(239,68,68,0.4)" }}>
                  カメラを起動 📷
                </button>
              </div>
            )}

            {/* Loading overlay */}
            {phase === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: "rgba(0,0,0,0.85)" }}>
                <div className="text-4xl mb-4 animate-spin">🥁</div>
                <p className="text-amber-300 animate-pulse">AIモデル読み込み中...</p>
                <p className="text-amber-600 text-xs mt-2">初回は30秒ほどかかります</p>
              </div>
            )}

            {/* Ready overlay */}
            {phase === "ready" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: "rgba(0,0,0,0.85)" }}>
                <div className="text-5xl mb-3">🎉</div>
                <p className="text-amber-300 font-bold mb-2">準備完了！</p>
                <p className="text-amber-600 text-xs text-center px-6 mb-4">カメラ前から1～2m離れて<br />全身が映るようにしてください</p>
                <button onClick={startGame}
                  className="px-10 py-3 rounded-xl font-black text-white transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#ef4444,#991b1b)" }}>
                  演奏スタート！🥁
                </button>
              </div>
            )}

            {/* Error overlay */}
            {(phase === "error" || error) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: "rgba(0,0,0,0.85)" }}>
                <div className="text-4xl mb-3">😢</div>
                <p className="text-red-400 text-sm text-center px-6">{error}</p>
                <button onClick={() => window.location.reload()}
                  className="mt-4 px-8 py-2 rounded-xl font-bold text-white text-sm"
                  style={{ background: "rgba(255,255,255,0.1)" }}>
                  リロード
                </button>
              </div>
            )}
          </div>

          {/* Controls */}
          {phase === "playing" && (
            <div className="w-full max-w-sm px-3 mt-3 space-y-2">
              <div className="flex gap-2">
                <button onClick={handleStop}
                  className="flex-1 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>
                  停止
                </button>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl font-bold text-sm"
                  style={{ background: "#000", color: "#fff" }}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  シェア
                </a>
              </div>
            </div>
          )}

          {/* Body part legend */}
          <div className="w-full max-w-sm px-3 mt-2">
            <div className="grid grid-cols-4 gap-1 text-center">
              {Object.entries(BODY_PART_COLORS).slice(0, 8).map(([part, color]) => (
                <div key={part} className="rounded-lg p-1.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid " + color + "40" }}>
                  <div className="w-3 h-3 rounded-full mx-auto mb-0.5" style={{ background: color }} />
                  <div className="text-xs" style={{ color, fontSize: "0.6rem" }}>
                    {part.replace("left_", "左").replace("right_", "右").replace("shoulder", "肩").replace("elbow", "肘").replace("wrist", "手首").replace("knee", "膝")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
