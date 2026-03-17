import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://zenshin-taiko.vercel.app";

export const metadata: Metadata = {
  title: "🥁 全身太鼓 ZENSHIN TAIKO | 体で太鼓を叩け！",
  description: "カメラで全身を読み取り、体の動きで太鼓を演奏！MediaPipe Poseで肩・肘・手首が太鼓の打点に。1人でも2人でも盛り上がる体感リズムゲーム。",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "🥁 全身太鼓 ZENSHIN TAIKO",
    description: "体全体が太鼓になる！カメラで全身を感知してリズム演奏",
    type: "website",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
