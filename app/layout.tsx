import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
