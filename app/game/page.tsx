"use client";
import dynamic from "next/dynamic";
const TaikoGame = dynamic(() => import("@/components/TaikoGame"), { ssr: false });
export default function GamePage() {
  return <TaikoGame />;
}
