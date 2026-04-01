import type { Metadata } from "next";
import { GoogleAdScript } from "@/components/GoogleAdScript";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const SITE_URL = "https://zenshin-taiko.vercel.app";

export const metadata: Metadata = {
  title: "全身太鼓 ZENSHIN TAIKO | 体で太鼓を叩け！",
  description: "カメラで全身を読み取り、体の動きで太鼓を演奏！MediaPipe Poseで肩・肘・手首が太鼓の打点に。1人でも2人でも盛り上がる体感リズムゲーム。",
  keywords: ["全身太鼓", "体感リズムゲーム", "カメラゲーム", "MediaPipe", "ブラウザゲーム", "無料ゲーム"],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "全身太鼓 ZENSHIN TAIKO",
    description: "体全体が太鼓になる！カメラで全身を感知してリズム演奏",
    type: "website",
    url: SITE_URL,
    siteName: "全身太鼓 ZENSHIN TAIKO",
    locale: "ja_JP",
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: "全身太鼓 ZENSHIN TAIKO" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "全身太鼓 ZENSHIN TAIKO",
    description: "体全体が太鼓になる！カメラで全身を感知してリズム演奏",
    images: [`${SITE_URL}/og.png`],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "全身太鼓",
  "description": "カメラで全身の動きを検出してリズムゲームを楽しむWebアプリ",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Web",
  "url": "https://zenshin-taiko.vercel.app",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "JPY" },
  "genre": "Rhythm Game"
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "全身太鼓を遊ぶにはカメラが必要ですか？", "acceptedAnswer": { "@type": "Answer", "text": "はい、全身の動きを認識するためWebカメラまたはスマートフォンのフロントカメラが必要です。" } },
    { "@type": "Question", "name": "スマートフォンでも遊べますか？", "acceptedAnswer": { "@type": "Answer", "text": "フロントカメラ付きのスマートフォン・タブレットでも遊べます。全身が映る距離に置いてご使用ください。" } },
    { "@type": "Question", "name": "認識精度が悪い場合はどうすればいいですか？", "acceptedAnswer": { "@type": "Answer", "text": "明るい場所で全身がカメラに映るよう調整してください。背景が単色だとより認識しやすくなります。" } },
    { "@type": "Question", "name": "どの体の部位で太鼓を叩けますか？", "acceptedAnswer": { "@type": "Answer", "text": "肩・肘・手首の動きを検出して太鼓を叩きます。大きく腕を振ると気持ちよく演奏できます。" } },
    { "@type": "Question", "name": "アプリのインストールは必要ですか？", "acceptedAnswer": { "@type": "Answer", "text": "不要です。ブラウザだけで遊べます。Chrome・Safari・Edgeなど主要ブラウザに対応しています。" } },
    { "@type": "Question", "name": "スコアは保存されますか？", "acceptedAnswer": { "@type": "Answer", "text": "ハイスコアはブラウザのローカルストレージに保存されます。" } },
    { "@type": "Question", "name": "BGMはオフにできますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい、画面上の音符アイコンをタップするとBGMのオン/オフを切り替えられます。" } },
    { "@type": "Question", "name": "子供でも遊べますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい、全身を動かす直感的な操作なので子供でも簡単に楽しめます。" } },
    { "@type": "Question", "name": "スコアをSNSでシェアできますか？", "acceptedAnswer": { "@type": "Answer", "text": "はい、ゲーム終了後にXへスコアをシェアするボタンが表示されます。" } },
    { "@type": "Question", "name": "ゲームは無料ですか？", "acceptedAnswer": { "@type": "Answer", "text": "基本プレイは完全無料です。広告表示により運営しています。" } }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      </head>
      <body>
        {children}
        <GoogleAdScript />
        <SpeedInsights />
        <footer style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#888' }}>
          <a href="/legal" style={{ color: '#aaa', marginRight: '12px' }}>特定商取引法に基づく表記</a>
          <a href="/privacy" style={{ color: '#aaa', marginRight: '12px' }}>プライバシーポリシー</a>
          <a href="/terms" style={{ color: '#aaa' }}>利用規約</a>
        </footer>
      </body>
    </html>
  );
}
