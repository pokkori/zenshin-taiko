import Link from "next/link";

const ITEMS = [
  { label: "販売業者", value: "新美諭" },
  { label: "運営責任者", value: "ポッコリラボ 代表 新美" },
  { label: "所在地", value: "非公開（請求があれば遅滞なく開示します）" },
  { label: "お問い合わせ", value: "levonadesign@gmail.com（X: @levona_design）" },
  { label: "サービス内容", value: "全身太鼓は無料でご利用いただけます" },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">特定商取引法に基づく表記</h1>
        <dl className="space-y-4">
          {ITEMS.map(item => (
            <div key={item.label} className="border-b border-gray-800 pb-4">
              <dt className="text-xs text-gray-500 mb-1">{item.label}</dt>
              <dd className="text-sm text-gray-200">{item.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8">
          <Link href="/" className="text-blue-400 hover:underline text-sm" aria-label="トップページに戻る">← トップに戻る</Link>
        </div>
      </div>
    </div>
  );
}
