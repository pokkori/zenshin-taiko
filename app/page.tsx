"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AdBanner } from "@/components/AdBanner";

function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {[
        { size: 5, x: 12, y: 22, dur: 9, delay: 0, color: "rgba(239,68,68,0.25)" },
        { size: 7, x: 72, y: 12, dur: 13, delay: 1, color: "rgba(251,191,36,0.20)" },
        { size: 4, x: 42, y: 68, dur: 10, delay: 2, color: "rgba(239,68,68,0.18)" },
        { size: 6, x: 88, y: 52, dur: 11, delay: 3, color: "rgba(251,191,36,0.15)" },
        { size: 3, x: 22, y: 82, dur: 8, delay: 4, color: "rgba(239,68,68,0.22)" },
        { size: 5, x: 58, y: 32, dur: 14, delay: 5, color: "rgba(251,191,36,0.18)" },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            left: `${p.x}%`, top: `${p.y}%`,
            backgroundColor: p.color,
            animation: `floatTaiko ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
            filter: "blur(1px)",
          }}
        />
      ))}
      <style>{`
        @keyframes floatTaiko {
          0% { transform: translateY(0) translateX(0); opacity: 0.4; }
          50% { opacity: 1; }
          100% { transform: translateY(-28px) translateX(14px); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

/* SVG Taiko drum icon */
function TaikoSVG() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="drumBody" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="drumFace" x1="30" y1="25" x2="70" y2="55" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="drumGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* drum body */}
      <ellipse cx="50" cy="58" rx="35" ry="28" fill="url(#drumBody)" filter="url(#drumGlow)" />
      {/* drum face */}
      <ellipse cx="50" cy="42" rx="35" ry="18" fill="url(#drumFace)" />
      <ellipse cx="50" cy="42" rx="28" ry="13" fill="rgba(255,255,255,0.15)" />
      {/* decorative rings */}
      <ellipse cx="50" cy="42" rx="35" ry="18" stroke="#fcd34d" strokeWidth="2" fill="none" />
      {/* drum sticks */}
      <rect x="14" y="20" width="4" height="30" rx="2" fill="#d97706" transform="rotate(-30, 16, 35)" />
      <rect x="82" y="20" width="4" height="30" rx="2" fill="#d97706" transform="rotate(30, 84, 35)" />
      {/* strike marks */}
      <circle cx="30" cy="70" r="2" fill="#fbbf24" opacity="0.6" />
      <circle cx="72" cy="68" r="2.5" fill="#fbbf24" opacity="0.5" />
      <circle cx="50" cy="78" r="1.5" fill="#fcd34d" opacity="0.4" />
    </svg>
  );
}

/* Step icons */
const StepIcons = [
  <svg key="t1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  <svg key="t2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  <svg key="t3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  <svg key="t4" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
];

export default function HomePage() {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const today = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem('taiko_streak') || '{"count":0,"last":""}');
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (data.last === today) setStreak(data.count);
    else if (data.last === yesterday) {
      const updated = { count: data.count + 1, last: today };
      localStorage.setItem('taiko_streak', JSON.stringify(updated));
      setStreak(updated.count);
    } else {
      const updated = { count: 1, last: today };
      localStorage.setItem('taiko_streak', JSON.stringify(updated));
      setStreak(1);
    }
  }, []);
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 relative"
      style={{
        background: "radial-gradient(ellipse at 20% 50%, rgba(239,68,68,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(251,191,36,0.10) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(217,119,6,0.08) 0%, transparent 50%), #0F0F1A",
      }}
    >
      <FloatingParticles />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Hero */}
        <div
          className="text-center mb-8 p-8 w-full"
          style={{
            background: "rgba(239,68,68,0.06)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(239,68,68,0.08)",
          }}
        >
          <div className="flex justify-center mb-4">
            <TaikoSVG />
          </div>
          <h1
            className="text-4xl font-black mb-1"
            style={{
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ef4444 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 20px rgba(251,191,36,0.3))",
            }}
          >
            全身太鼓
          </h1>
          <p className="text-amber-300/80 text-lg font-bold mb-1">ZENSHIN TAIKO</p>
          <p className="text-amber-500/60 text-sm">体を動かして太鼓を演奏!</p>
        </div>

        {streak > 1 && (
          <div
            className="text-center text-sm text-orange-300 mb-4 px-5 py-2 rounded-full font-bold"
            style={{
              background: "rgba(251,146,60,0.1)",
              border: "1px solid rgba(251,146,60,0.25)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline mr-1 -mt-0.5" aria-hidden="true">
              <path d="M8 1L10 6H15L11 9.5L12.5 15L8 11.5L3.5 15L5 9.5L1 6H6L8 1Z" fill="#fb923c" />
            </svg>
            {streak}日連続プレイ中!
          </div>
        )}

        {/* CTA */}
        <Link
          href="/game"
          className="inline-block px-14 py-4 rounded-2xl text-xl font-black mb-8 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] min-h-[52px]"
          aria-label="全身太鼓ゲームを開始する"
          style={{
            background: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)",
            color: "#fff",
            boxShadow: "0 0 30px rgba(239,68,68,0.4), 0 4px 20px rgba(0,0,0,0.3)",
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          演奏スタート
        </Link>

        {/* How to play */}
        <div className="w-full space-y-3">
          {[
            { title: "カメラを許可する", desc: "フロントカメラで全身を映す（明るい場所推奨）" },
            { title: "体全体が太鼓になる", desc: "肩・肘・手首・膝などが打点に変わる" },
            { title: "動かすと音が鳴る", desc: "速く動かすほど大きな音! リズムよく叩こう" },
            { title: "演奏動画をシェア", desc: "スコアをXに投稿して友達に挑戦状を送ろう" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex gap-3 items-center p-4"
              style={{
                background: "rgba(239,68,68,0.06)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(239,68,68,0.12)",
                borderRadius: "16px",
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(251,191,36,0.12)" }}>
                {StepIcons[i]}
              </div>
              <div>
                <div className="font-bold text-amber-200 text-sm">{item.title}</div>
                <div className="text-xs text-amber-500/60">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ad Banner */}
        <AdBanner slot="0000000000" />

        {/* Footer */}
        <footer
          className="mt-10 text-center text-xs text-amber-600/50 pb-6 w-full px-4 py-5"
          style={{
            background: "rgba(239,68,68,0.03)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: "16px",
            border: "1px solid rgba(239,68,68,0.06)",
          }}
        >
          <p>&copy; 2026 ポッコリラボ</p>
          <p className="mt-1">
            <a href="https://twitter.com/levona_design" className="underline hover:text-amber-400 transition-colors" aria-label="Xでお問い合わせ（@levona_design）">お問い合わせ: X @levona_design</a>
          </p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" aria-label="プライバシーポリシーを見る" className="underline hover:text-amber-400 transition-colors">プライバシーポリシー</a>
            <a href="/legal" aria-label="特定商取引法に基づく表示" className="underline hover:text-amber-400 transition-colors">特商法表記</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
