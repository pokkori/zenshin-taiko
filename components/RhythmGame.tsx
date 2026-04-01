"use client";

import { useRef, useState, useEffect, useCallback } from "react";

// ===== 型定義 =====
type Zone = "left" | "right" | "both";
type Judgment = "PERFECT" | "GOOD" | "MISS";

interface Marker {
  id: number;
  zone: Zone;
  spawnTime: number; // ms (AudioContext時間ベース)
  hitTime: number;   // 判定ラインに到達するべきms
  hit: boolean;
  missed: boolean;
}

interface JudgmentEffect {
  id: number;
  judgment: Judgment;
  zone: Zone;
  createdAt: number;
}

// ===== 定数 =====
const GAME_DURATION = 30; // 秒
const FALL_DURATION = 1600; // マーカーが降るms
const HIT_LINE_Y = 80; // %（下から）
const PERFECT_WINDOW = 80; // ms
const GOOD_WINDOW = 160; // ms
const BPM = 120;
const BEAT_INTERVAL = (60 / BPM) * 1000; // ms

// BPMに合わせたパターン生成（30秒分）
function generateBeats(): { zone: Zone; beatTime: number }[] {
  const beats: { zone: Zone; beatTime: number }[] = [];
  const zones: Zone[] = ["right", "left", "right", "left", "both", "right", "left", "right"];
  let beat = 0;
  for (let t = 0; t < GAME_DURATION * 1000; t += BEAT_INTERVAL) {
    beats.push({ zone: zones[beat % zones.length], beatTime: t });
    beat++;
    // 時々連打
    if (beat % 7 === 0 && t + BEAT_INTERVAL / 2 < GAME_DURATION * 1000) {
      beats.push({ zone: zones[(beat + 2) % zones.length], beatTime: t + BEAT_INTERVAL / 2 });
    }
  }
  return beats;
}

const BEAT_SCHEDULE = generateBeats();

// ===== カラー =====
const ZONE_COLORS: Record<Zone, string> = {
  left: "#3b82f6",
  right: "#ef4444",
  both: "#f59e0b",
};

const JUDGMENT_COLORS: Record<Judgment, string> = {
  PERFECT: "#fbbf24",
  GOOD: "#22c55e",
  MISS: "#6b7280",
};

const JUDGMENT_SCORES: Record<Judgment, number> = {
  PERFECT: 100,
  GOOD: 50,
  MISS: 0,
};

export default function RhythmGame() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "result">("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [effects, setEffects] = useState<JudgmentEffect[]>([]);
  const [lastJudgment, setLastJudgment] = useState<Judgment | null>(null);
  const [perfectCount, setPerfectCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const markerIdRef = useRef(0);
  const effectIdRef = useRef(0);
  const markersRef = useRef<Marker[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const perfectCountRef = useRef(0);
  const goodCountRef = useRef(0);
  const missCountRef = useRef(0);
  const rafRef = useRef<number>(0);
  const scheduledBeatsRef = useRef<Set<number>>(new Set());
  const beatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMutedRef = useRef(false);
  const gameStateRef = useRef<"idle" | "playing" | "result">("idle");

  // ===== サウンド =====
  const playHitSound = useCallback((judgment: Judgment) => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const freq = judgment === "PERFECT" ? 200 : judgment === "GOOD" ? 150 : 80;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(judgment === "MISS" ? 0.1 : 0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);

      // ノイズ（ドラム感）
      if (judgment !== "MISS") {
        const bufSize = Math.floor(ctx.sampleRate * 0.08);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        const noiseGain = ctx.createGain();
        noise.buffer = buf;
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        noise.start(ctx.currentTime);
      }
    } catch (_e) { /* non-fatal */ }
  }, []);

  // BGMビート（メトロノーム感）
  const playBeatTick = useCallback(() => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (_e) { /* non-fatal */ }
  }, []);

  // ===== 判定処理 =====
  const judgeHit = useCallback((zone: Zone) => {
    if (gameStateRef.current !== "playing") return;
    const now = Date.now() - startTimeRef.current;
    const activeMarkers = markersRef.current;

    // 同ゾーンのマーカーから最も近いものを探す
    let closest: Marker | null = null;
    let closestDiff = Infinity;

    for (const m of activeMarkers) {
      if (m.hit || m.missed) continue;
      // zone一致（bothは左右どちらでもOK）
      const zoneMatch = m.zone === zone || m.zone === "both";
      if (!zoneMatch) continue;
      const diff = Math.abs(now - m.hitTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = m;
      }
    }

    let judgment: Judgment = "MISS";
    if (closest && closestDiff <= GOOD_WINDOW) {
      judgment = closestDiff <= PERFECT_WINDOW ? "PERFECT" : "GOOD";
      closest.hit = true;
    }

    // スコア更新
    const pts = JUDGMENT_SCORES[judgment];
    const newCombo = judgment !== "MISS" ? comboRef.current + 1 : 0;
    const comboBonus = newCombo >= 10 ? Math.floor(newCombo / 10) : 0;
    const totalPts = pts + comboBonus * 10;

    scoreRef.current += totalPts;
    comboRef.current = newCombo;
    if (newCombo > maxComboRef.current) maxComboRef.current = newCombo;

    if (judgment === "PERFECT") perfectCountRef.current++;
    else if (judgment === "GOOD") goodCountRef.current++;
    else missCountRef.current++;

    setScore(scoreRef.current);
    setCombo(newCombo);
    setMaxCombo(maxComboRef.current);
    setLastJudgment(judgment);

    // エフェクト
    const eid = effectIdRef.current++;
    setEffects(prev => [...prev, { id: eid, judgment, zone: closest?.zone ?? zone, createdAt: Date.now() }]);
    setTimeout(() => setEffects(prev => prev.filter(e => e.id !== eid)), 600);

    playHitSound(judgment);
  }, [playHitSound]);

  // ===== ゲームループ =====
  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, GAME_DURATION - elapsed / 1000);
    setTimeLeft(Math.ceil(remaining));

    // マーカースポーン
    for (let i = 0; i < BEAT_SCHEDULE.length; i++) {
      const beat = BEAT_SCHEDULE[i];
      const spawnAt = beat.beatTime - FALL_DURATION; // 降り始めタイミング
      if (spawnAt <= elapsed && !scheduledBeatsRef.current.has(i)) {
        scheduledBeatsRef.current.add(i);
        const newMarker: Marker = {
          id: markerIdRef.current++,
          zone: beat.zone,
          spawnTime: elapsed,
          hitTime: beat.beatTime,
          hit: false,
          missed: false,
        };
        markersRef.current = [...markersRef.current, newMarker];
        setMarkers([...markersRef.current]);
        playBeatTick();
      }
    }

    // Miss判定（判定ウィンドウ超過）
    let missed = false;
    markersRef.current.forEach(m => {
      if (!m.hit && !m.missed && elapsed > m.hitTime + GOOD_WINDOW) {
        m.missed = true;
        missed = true;
        missCountRef.current++;
        comboRef.current = 0;
      }
    });
    if (missed) {
      setMissCount(missCountRef.current);
      setCombo(0);
    }

    // 古いマーカーを削除
    const before = markersRef.current.length;
    markersRef.current = markersRef.current.filter(
      m => elapsed < m.hitTime + FALL_DURATION * 0.5
    );
    if (markersRef.current.length !== before) {
      setMarkers([...markersRef.current]);
    }

    if (remaining <= 0) {
      // ゲーム終了
      gameStateRef.current = "result";
      setGameState("result");
      setPerfectCount(perfectCountRef.current);
      setGoodCount(goodCountRef.current);
      setMissCount(missCountRef.current);
      return;
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [playBeatTick]);

  const startGame = useCallback(() => {
    // リセット
    markersRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    perfectCountRef.current = 0;
    goodCountRef.current = 0;
    missCountRef.current = 0;
    scheduledBeatsRef.current = new Set();
    markerIdRef.current = 0;
    effectIdRef.current = 0;

    setMarkers([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setEffects([]);
    setLastJudgment(null);
    setPerfectCount(0);
    setGoodCount(0);
    setMissCount(0);

    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch (_e) { /* non-fatal */ }
    }

    startTimeRef.current = Date.now();
    gameStateRef.current = "playing";
    setGameState("playing");
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, []);

  // ===== マーカー表示位置計算 =====
  const getMarkerStyle = useCallback((marker: Marker): React.CSSProperties => {
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(1, Math.max(0, (elapsed - (marker.hitTime - FALL_DURATION)) / FALL_DURATION));
    const topPct = progress * (100 - HIT_LINE_Y);
    return {
      top: `${topPct}%`,
      opacity: marker.hit ? 0 : 1,
      transition: "opacity 0.1s",
    };
  }, []);

  // ===== シェア =====
  const shareText = `【全身太鼓】リズムチャレンジで${score}点！\n${maxCombo}コンボ達成\nあなたも挑戦 → https://zenshin-taiko.vercel.app\n#全身太鼓 #リズムゲーム`;
  const shareUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText);

  // ===== Idle画面 =====
  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] px-4 py-8 select-none">
        <svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true" className="mb-4">
          <ellipse cx="32" cy="36" rx="24" ry="18" fill="#b91c1c" />
          <ellipse cx="32" cy="32" rx="24" ry="18" fill="#ef4444" />
          <ellipse cx="32" cy="32" rx="18" ry="13" fill="#fbbf24" />
          <text x="32" y="37" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#7f1d1d">Rhythm</text>
        </svg>
        <h2 className="text-2xl font-black mb-1 text-slate-100">リズムチャレンジ</h2>
        <p className="text-slate-300 text-sm text-center mb-2">カメラ不要! タップでリズムゲーム</p>
        <div className="mb-6 space-y-2 w-full max-w-xs">
          {[
            { icon: "L", color: "#3b82f6", text: "左エリアをタップ -> 左拍子" },
            { icon: "R", color: "#ef4444", text: "右エリアをタップ -> 右拍子" },
            { icon: "LR", color: "#f59e0b", text: "両エリア同時 -> ドン!" },
            { icon: "30s", color: "#22c55e", text: "30秒間でハイスコアを目指せ" },
          ].map((item, i) => (
            <div key={i} className="flex gap-2 items-center text-sm text-slate-200">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-slate-100" style={{ background: item.color + "33", border: `1px solid ${item.color}55` }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
        <button
          onClick={startGame}
          aria-label="ゲームをスタートする"
          className="px-12 py-4 rounded-2xl font-black text-slate-100 text-lg transition-all active:scale-[0.97] min-h-[44px]"
          style={{
            background: "linear-gradient(135deg,#ef4444,#991b1b)",
            boxShadow: "0 0 24px rgba(239,68,68,0.5)",
          }}
        >
          スタート！
        </button>
      </div>
    );
  }

  // ===== Result画面 =====
  if (gameState === "result") {
    const total = perfectCountRef.current + goodCountRef.current + missCountRef.current;
    const accuracy = total > 0 ? Math.round(((perfectCountRef.current + goodCountRef.current) / total) * 100) : 0;
    const rank = score >= 8000 ? "S" : score >= 6000 ? "A" : score >= 4000 ? "B" : score >= 2000 ? "C" : "D";
    const rankColors: Record<string, string> = { S: "#fbbf24", A: "#22c55e", B: "#3b82f6", C: "#a855f7", D: "#6b7280" };

    return (
      <div className="flex flex-col items-center px-4 py-8 select-none">
        <svg width="48" height="48" viewBox="0 0 64 64" aria-hidden="true" className="mb-3">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#fbbf24" strokeWidth="3" />
          <path d="M20 32l8 8 16-16" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <h2 className="text-xl font-black mb-4 text-slate-100">リザルト</h2>

        <div className="w-full max-w-xs rounded-2xl p-5 mb-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-center">
            <div className="text-6xl font-black" style={{ color: rankColors[rank] }}>{rank}</div>
            <div className="text-amber-300 text-sm">RANK</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-white">{score.toLocaleString()}</div>
            <div className="text-amber-500 text-xs">SCORE</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="font-bold" style={{ color: JUDGMENT_COLORS.PERFECT }}>
                {perfectCountRef.current}
              </div>
              <div className="text-xs text-amber-700">PERFECT</div>
            </div>
            <div>
              <div className="font-bold" style={{ color: JUDGMENT_COLORS.GOOD }}>
                {goodCountRef.current}
              </div>
              <div className="text-xs text-amber-700">GOOD</div>
            </div>
            <div>
              <div className="font-bold" style={{ color: JUDGMENT_COLORS.MISS }}>
                {missCountRef.current}
              </div>
              <div className="text-xs text-amber-700">MISS</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div>
              <div className="font-bold text-amber-200">{maxComboRef.current}</div>
              <div className="text-xs text-amber-700">MAX COMBO</div>
            </div>
            <div>
              <div className="font-bold text-amber-200">{accuracy}%</div>
              <div className="text-xs text-amber-700">ACCURACY</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full max-w-xs">
          <button
            onClick={startGame}
            aria-label="もう一度プレイする"
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#ef4444,#991b1b)", color: "#fff" }}
          >
            もう一度
          </button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm"
            style={{ background: "#000", color: "#fff", border: "1px solid #333" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            シェア
          </a>
        </div>
      </div>
    );
  }

  // ===== Playing画面 =====
  return (
    <div className="flex flex-col select-none" style={{ minHeight: "calc(100dvh - 50px)" }}>
      {/* ステータスバー */}
      <div className="flex items-center justify-between px-3 py-1.5"
        style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-amber-500 font-bold">{score.toLocaleString()}pt</span>
          {combo >= 5 && (
            <span className="text-xs font-black" style={{ color: "#fbbf24" }}>{combo} COMBO!</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black" style={{ color: timeLeft <= 10 ? "#ef4444" : "#22c55e" }}>
             {timeLeft}s
          </span>
          <button onClick={() => { isMutedRef.current = !isMutedRef.current; setIsMuted(isMutedRef.current); }}
            aria-label={isMuted ? "サウンドをオンにする" : "サウンドをオフにする（ミュート）"}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center">
            {isMuted
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#78350f"/><line x1="23" y1="9" x2="17" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fbbf24"/><path d="M15.54 8.46a5 5 0 010 7.07" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><path d="M19.07 4.93a10 10 0 010 14.14" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/></svg>
            }
          </button>
        </div>
      </div>

      {/* 判定テキスト */}
      <div className="text-center h-7 flex items-center justify-center">
        {lastJudgment && (
          <span className="text-base font-black animate-bounce"
            style={{ color: JUDGMENT_COLORS[lastJudgment] }}>
            {lastJudgment}
            {lastJudgment === "PERFECT" && <svg className="inline w-4 h-4 ml-1" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3"/></svg>}
          </span>
        )}
      </div>

      {/* ゲームフィールド */}
      <div className="flex flex-1 gap-1 px-1" style={{ minHeight: "55dvh" }}>
        {/* 左ゾーン */}
        <RhythmZone
          zone="left"
          markers={markers.filter(m => m.zone === "left" || m.zone === "both")}
          onTap={() => judgeHit("left")}
          getMarkerStyle={getMarkerStyle}
          effects={effects.filter(e => e.zone === "left" || e.zone === "both")}
        />
        {/* 右ゾーン */}
        <RhythmZone
          zone="right"
          markers={markers.filter(m => m.zone === "right" || m.zone === "both")}
          onTap={() => judgeHit("right")}
          getMarkerStyle={getMarkerStyle}
          effects={effects.filter(e => e.zone === "right" || e.zone === "both")}
        />
      </div>

      {/* タイムバー */}
      <div className="px-2 pb-2">
        <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${(timeLeft / GAME_DURATION) * 100}%`,
              background: timeLeft <= 10 ? "#ef4444" : "#22c55e",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ===== RhythmZone サブコンポーネント =====
interface RhythmZoneProps {
  zone: Zone;
  markers: Marker[];
  onTap: () => void;
  getMarkerStyle: (m: Marker) => React.CSSProperties;
  effects: JudgmentEffect[];
}

function RhythmZone({ zone, markers, onTap, getMarkerStyle, effects }: RhythmZoneProps) {
  const [pressed, setPressed] = useState(false);
  const color = ZONE_COLORS[zone];
  const label = zone === "left" ? "左\nLEFT" : "右\nRIGHT";
  const IconSvg = zone === "left"
    ? () => <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><ellipse cx="16" cy="18" rx="12" ry="9" fill="#b91c1c"/><ellipse cx="16" cy="16" rx="12" ry="9" fill="#ef4444"/><ellipse cx="16" cy="16" rx="9" ry="6" fill="#fbbf24"/><text x="16" y="20" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#7f1d1d">左</text></svg>
    : () => <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><ellipse cx="16" cy="18" rx="12" ry="9" fill="#7f1d1d"/><ellipse cx="16" cy="16" rx="12" ry="9" fill="#dc2626"/><ellipse cx="16" cy="16" rx="9" ry="6" fill="#fbbf24"/><text x="16" y="20" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#7f1d1d">右</text></svg>;

  const handlePress = () => {
    setPressed(true);
    onTap();
    setTimeout(() => setPressed(false), 120);
  };

  return (
    <div
      className="flex-1 relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: pressed
          ? `rgba(${zone === "left" ? "59,130,246" : "239,68,68"},0.3)`
          : `rgba(${zone === "left" ? "59,130,246" : "239,68,68"},0.06)`,
        border: `2px solid ${color}${pressed ? "cc" : "33"}`,
        transition: "background 0.1s, border-color 0.1s",
        minHeight: "55dvh",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onPointerDown={handlePress}
    >
      {/* 判定ライン */}
      <div
        className="absolute left-0 right-0 h-0.5"
        style={{
          bottom: `${HIT_LINE_Y}%`,
          background: color,
          opacity: 0.6,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      {/* 判定エリア（グロー） */}
      <div
        className="absolute left-0 right-0 h-8"
        style={{
          bottom: `calc(${HIT_LINE_Y}% - 1rem)`,
          background: `linear-gradient(transparent, ${color}15, transparent)`,
        }}
      />

      {/* マーカー */}
      {markers.map(m => (
        <div
          key={m.id}
          className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center font-black text-sm"
          style={{
            ...getMarkerStyle(m),
            background: `radial-gradient(circle, ${ZONE_COLORS[m.zone]}cc, ${ZONE_COLORS[m.zone]}44)`,
            border: `2px solid ${ZONE_COLORS[m.zone]}`,
            boxShadow: `0 0 12px ${ZONE_COLORS[m.zone]}88`,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <ellipse cx="16" cy="20" rx="11" ry="8" fill="rgba(0,0,0,0.4)"/>
            <ellipse cx="16" cy="16" rx="11" ry="8" fill="none" stroke="#fff" strokeWidth="1.5"/>
            <ellipse cx="16" cy="16" rx="7" ry="4.5" fill="rgba(255,255,255,0.7)"/>
            <rect x="6" y="8" width="3" height="10" rx="1.5" fill="#fff" opacity="0.8"/>
            <rect x="23" y="8" width="3" height="10" rx="1.5" fill="#fff" opacity="0.8"/>
          </svg>
        </div>
      ))}

      {/* エフェクト */}
      {effects.map(e => (
        <div
          key={e.id}
          className="absolute left-1/2 -translate-x-1/2 font-black text-sm pointer-events-none animate-ping"
          style={{
            bottom: `${HIT_LINE_Y}%`,
            transform: "translate(-50%, 50%)",
            color: JUDGMENT_COLORS[e.judgment],
            fontSize: "0.75rem",
            animationDuration: "0.5s",
            animationIterationCount: 1,
          }}
        >
          {e.judgment}
        </div>
      ))}

      {/* ゾーンラベル */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center pointer-events-none"
        style={{ color: `${color}88` }}
      >
        <IconSvg />
        <div className="text-xs font-bold whitespace-pre-line leading-tight" style={{ fontSize: "0.6rem" }}>
          {label}
        </div>
      </div>
    </div>
  );
}
