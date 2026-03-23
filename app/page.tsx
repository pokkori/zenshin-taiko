import Link from "next/link";
import Image from "next/image";
export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg, #0a0500, #1a0a00, #0a0500)" }}>
      <div className="text-center mb-8">
        <Image src="/images/taiko.png" alt="太鼓" width={120} height={120} className="mx-auto mb-3" style={{ filter: "drop-shadow(0 0 24px rgba(239,68,68,0.7))" }} priority />
        <h1 className="text-4xl font-black mb-1"
          style={{ color: "#fbbf24", textShadow: "0 0 20px rgba(251,191,36,0.5)" }}>
          全身太鼓
        </h1>
        <p className="text-amber-300 text-lg font-bold mb-1">ZENSHIN TAIKO</p>
        <p className="text-amber-600 text-sm">体を動かして太鼓を演奏！</p>
      </div>
      <Link href="/game"
        className="inline-block px-14 py-4 rounded-2xl text-xl font-black mb-8 transition-all active:scale-95 min-h-[44px]"
        aria-label="全身太鼓ゲームを開始する"
        style={{
          background: "linear-gradient(135deg, #ef4444, #991b1b)",
          color: "#fff",
          boxShadow: "0 0 30px rgba(239,68,68,0.5)",
        }}>
        演奏スタート
      </Link>
      <div className="w-full max-w-sm space-y-3">
        {[
          { icon: "📷", title: "カメラを許可する", desc: "フロントカメラで全身を映す（明るい場所推奨）" },
          { icon: "🙋", title: "体全体が太鼓になる", desc: "肩・肘・手首・膝などが打点に変わる" },
          { icon: "🥁", title: "動かすと音が鳴る", desc: "速く動かすほど大きな音！リズムよく叩こう" },
          { icon: "📤", title: "演奏動画をシェア", desc: "スコアをXに投稿して友達に挑戦状を送ろう" },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 items-center p-3 rounded-xl"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="font-bold text-amber-200 text-sm">{item.title}</div>
              <div className="text-xs text-amber-600">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <footer className="mt-10 text-center text-xs text-amber-900 pb-6">
        <p>© 2026 ポッコリラボ</p>
        <p className="mt-1">
          <a href="https://twitter.com/levona_design" className="underline hover:text-amber-700" aria-label="Xでお問い合わせ（@levona_design）">お問い合わせ: X @levona_design</a>
        </p>
        <div className="mt-2 space-x-4">
          <a href="/privacy" className="underline hover:text-amber-700" aria-label="プライバシーポリシーを見る">プライバシーポリシー</a>
          <a href="/legal" className="underline hover:text-amber-700" aria-label="特定商取引法に基づく表記を見る">特商法表記</a>
        </div>
      </footer>
    </div>
  );
}
