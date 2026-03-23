import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">プライバシーポリシー</h1>
        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">カメラ・身体情報の取り扱いについて</h2>
            <p>全身太鼓は、ゲームプレイのためにカメラ映像とMediaPipe Poseによる骨格検出を使用します。カメラ映像および骨格データは端末上のみで処理され、サーバーへの送信や外部への提供は一切行いません。</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">収集する情報</h2>
            <p>当アプリは以下の情報を収集します：</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>カメラ映像（ゲームプレイ中のみ、端末上で処理・保存なし）</li>
              <li>ゲームスコア・最高記録（端末のlocalStorageに保存）</li>
              <li>連続プレイ日数（端末のlocalStorageに保存）</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">第三者への提供</h2>
            <p>収集した情報を第三者に提供することはありません。</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">お問い合わせ</h2>
            <p>X（Twitter）: <a href="https://x.com/levona_design" className="text-blue-400 hover:underline" aria-label="運営者のXアカウントを開く">@levona_design</a></p>
          </section>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-blue-400 hover:underline text-sm" aria-label="全身太鼓のトップページに戻る">← トップに戻る</Link>
        </div>
      </div>
    </div>
  );
}
