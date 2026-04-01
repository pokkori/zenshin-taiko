"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useTaikoGame } from "@/hooks/useTaikoGame";
import { BODY_PART_COLORS } from "@/lib/rhythmPatterns";
import dynamic from "next/dynamic";
import { updateStreak, loadStreak, getStreakMilestoneMessage, type StreakData } from "@/lib/streak";
import OrbBackground from "@/components/OrbBackground";

// カメラモード: クリア後コンフェッティ (15粒)
const VICTORY_CONFETTI_COLORS_TAIKO = ["#FFD93D", "#6366f1", "#f43f5e", "#22c55e", "#fbbf24", "#a855f7", "#ef4444"];

function VictoryConfettiTaiko() {
  const pieces = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      fallDur: (2.4 + Math.random() * 1.4).toFixed(2),
      fallDelay: (Math.random() * 0.8).toFixed(2),
      swayDur: (0.9 + Math.random() * 0.6).toFixed(2),
      color: VICTORY_CONFETTI_COLORS_TAIKO[i % VICTORY_CONFETTI_COLORS_TAIKO.length],
      w: 7 + Math.floor(Math.random() * 7),
      h: 5 + Math.floor(Math.random() * 5),
    })), []);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 200 }}>
      {pieces.map(p => (
        <div
          key={p.id}
          className="victory-confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.w}px`,
            height: `${p.h}px`,
            background: p.color,
            "--fall-dur": `${p.fallDur}s`,
            "--fall-delay": `${p.fallDelay}s`,
            "--sway-dur": `${p.swayDur}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

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
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastHitCount, setLastHitCount] = useState<number | null>(null);
  const [showConfettiCamera, setShowConfettiCamera] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  useEffect(() => {
    const b = localStorage.getItem("taiko_best");
    if (b) setBestScore(parseInt(b));
    setStreakData(loadStreak("zenshin_taiko"));
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
    const newBest = score > prev;
    if (newBest) {
      localStorage.setItem("taiko_best", String(score));
      setBestScore(score);
      setIsNewBest(true);
      setShowConfettiCamera(true);
      setTimeout(() => setShowConfettiCamera(false), 3500);
    } else {
      setIsNewBest(false);
    }
    const updated = updateStreak("zenshin_taiko");
    setStreakData(updated);
    setLastScore(score);
    setLastHitCount(hitCount);
    stopGame();
  }, [score, hitCount, stopGame]);

  const shareText = `全身太鼓ZENSHINで${hitCount}回ヒット!\nスコア: ${score}点\n体で太鼓を叩いてみた!\n#全身太鼓 #ZENSHINTAIKO\nhttps://zenshin-taiko.vercel.app`;
  const shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);

  return (
    <div className="flex flex-col min-h-dvh items-center relative"
      style={{ background: "linear-gradient(160deg,#120208,#1a0a00,#120208)" }}>
      <OrbBackground />
      {showConfettiCamera && <VictoryConfettiTaiko />}

      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between px-3 py-2">
        <a href="/" className="text-amber-600 text-sm" aria-label="トップページに戻る">← トップ</a>
        <span className="font-black text-base" style={{ color: "#fbbf24" }}>全身太鼓</span>
        <div className="flex items-center gap-2">
          {bestScore !== null && (
            <span className="text-xs text-yellow-500" aria-label={`ベストスコア ${bestScore}点`}>Best:{bestScore}</span>
          )}
          {activeTab === "camera" && (
            <button onClick={toggleMute} className="min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={isMuted ? "ミュートを解除する" : "ミュートにする"}>
              {isMuted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#78350f"/><line x1="23" y1="9" x2="17" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fbbf24"/><path d="M15.54 8.46a5 5 0 010 7.07" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><path d="M19.07 4.93a10 10 0 010 14.14" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/></svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="w-full max-w-sm px-3 mb-2">
        <div className="flex rounded-xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => handleTabChange("rhythm")}
            className="flex-1 py-2 text-sm font-bold transition-all min-h-[44px]"
            aria-label="リズムモードに切り替え"
            aria-pressed={activeTab === "rhythm"}
            style={{
              background: activeTab === "rhythm"
                ? "linear-gradient(135deg,#ef4444,#991b1b)"
                : "transparent",
              color: activeTab === "rhythm" ? "#fff" : "#78350f",
            }}
          >
            リズムモード
          </button>
          <button
            onClick={() => handleTabChange("camera")}
            className="flex-1 py-2 text-sm font-bold transition-all min-h-[44px]"
            aria-label="全身カメラモードに切り替え"
            aria-pressed={activeTab === "camera"}
            style={{
              background: activeTab === "camera"
                ? "linear-gradient(135deg,#f97316,#c2410c)"
                : "transparent",
              color: activeTab === "camera" ? "#fff" : "#78350f",
            }}
          >
            全身モード
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
              role="img"
              aria-label="全身太鼓ゲームキャンバス — 体の動きを検出して太鼓を演奏"
              style={{ maxHeight: "70dvh", objectFit: "contain", background: "#0a0500" }}
            />

            {/* Idle overlay */}
            {phase === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: "rgba(0,0,0,0.85)" }}>
                <svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true" className="mb-4">
                  <ellipse cx="32" cy="36" rx="24" ry="18" fill="#b91c1c" />
                  <ellipse cx="32" cy="32" rx="24" ry="18" fill="#ef4444" />
                  <ellipse cx="32" cy="32" rx="18" ry="13" fill="#fbbf24" />
                  <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#7f1d1d">太鼓</text>
                </svg>
                <h2 className="text-2xl font-black mb-2 text-slate-100">全身太鼓</h2>
                <p className="text-slate-300 text-sm text-center px-8 mb-4">体全体が太鼓になる!<br />カメラを許可してプレイ開始</p>
                {streakData && streakData.count > 0 && (
                  <div className="mb-4 px-4 py-2 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-slate-200 font-bold text-sm">{streakData.count}日連続プレイ中</p>
                    {getStreakMilestoneMessage(streakData.count) && (
                      <p className="text-amber-400 text-xs mt-0.5">{getStreakMilestoneMessage(streakData.count)}</p>
                    )}
                  </div>
                )}
                <button onClick={loadModel}
                  className="px-10 py-3 rounded-xl font-black text-white transition-all active:scale-95 min-h-[44px]"
                  aria-label="カメラを起動してAIモデルを読み込む"
                  style={{ background: "linear-gradient(135deg,#ef4444,#991b1b)", boxShadow: "0 0 20px rgba(239,68,68,0.4)" }}>
                  カメラを起動
                </button>
              </div>
            )}

            {/* Loading overlay */}
            {phase === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: "rgba(0,0,0,0.85)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4 animate-spin" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="rgba(251,191,36,0.3)" strokeWidth="3" />
                  <path d="M12 2a10 10 0 019.8 8" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <p className="text-slate-200 animate-pulse">AIモデル読み込み中...</p>
                <p className="text-slate-400 text-xs mt-2">初回は30秒ほどかかります</p>
              </div>
            )}

            {/* Ready overlay */}
            {phase === "ready" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: "rgba(0,0,0,0.85)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-3" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="#22c55e" />
                  <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-slate-200 font-bold mb-2">準備完了!</p>
                <p className="text-slate-400 text-xs text-center px-6 mb-4">カメラ前から1~2m離れて<br />全身が映るようにしてください</p>
                {/* 直前のスコア結果 */}
                {lastScore !== null && (
                  <div
                    className="mb-4 px-5 py-3 rounded-2xl text-center w-full max-w-xs score-card-in"
                    style={{
                      background: isNewBest ? "linear-gradient(135deg,#1e1b4b,#312e81)" : "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(16px)",
                      border: isNewBest ? "2px solid #FFD93D" : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: isNewBest ? "0 0 40px rgba(255,217,61,0.45)" : "none",
                    }}
                  >
                    {isNewBest && (
                      <p className="font-black text-sm mb-1" style={{ color: "#FFD93D", textShadow: "0 0 12px rgba(255,217,61,0.7)" }}>
                        NEW BEST !
                      </p>
                    )}
                    <p className="text-slate-100 font-black text-lg">{lastScore}点 / {lastHitCount}回ヒット</p>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`全身太鼓で${lastScore}点達成！${lastHitCount}回ヒット！ #全身太鼓ゲーム https://zenshin-taiko.vercel.app`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="全身太鼓のスコアをXでシェアする"
                      className="flex items-center justify-center gap-2 mt-2 w-full py-2 rounded-xl font-bold text-sm min-h-[44px] transition-colors hover:bg-gray-800"
                      style={{ background: "#000", color: "#fff" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Xでシェア
                    </a>
                  </div>
                )}
                <button onClick={startGame}
                  className="px-10 py-3 rounded-xl font-black text-white transition-all active:scale-95 min-h-[44px]"
                  aria-label="演奏をスタートする"
                  style={{ background: "linear-gradient(135deg,#ef4444,#991b1b)" }}>
                  演奏スタート！
                </button>
              </div>
            )}

            {/* Error overlay */}
            {(phase === "error" || error) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                style={{ background: "rgba(0,0,0,0.85)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-3" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="#ef4444" />
                  <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <p className="text-red-400 text-sm text-center px-6">{error}</p>
                <button onClick={() => window.location.reload()}
                  className="mt-4 px-8 py-2 rounded-xl font-bold text-white text-sm min-h-[44px]"
                  aria-label="ページをリロードして再試行する"
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
                  className="flex-1 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 min-h-[44px]"
                  aria-label="演奏を停止してスコアを記録する"
                  style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>
                  停止
                </button>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl font-bold text-sm min-h-[44px]"
                  aria-label="Xでスコアをシェアする"
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
