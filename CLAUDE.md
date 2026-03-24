# このサービスの品質ルール（必読・省略不可）

## ★ 絶対禁止
- JSX/TSXの中に絵文字を書かない

## ★ accessibilityLabel（QAゲート）
- 全てのPressable/TouchableOpacity/Buttonに accessibilityLabel 必須

## ★ タッチターゲット
- 全ボタン: minHeight:44, minWidth:44

## ★ BGM・SE
- assets/audio/bgm_normal.mp3, bgm_fever.mp3（必須）
- se_tap.mp3, se_complete.mp3, se_error.mp3, se_achievement.mp3（必須）

## ★ グラスモーフィズム
- 主要カード: backgroundColor:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.15)', borderWidth:1

## ★ ビルド確認
- npx tsc --noEmit でエラーゼロ確認後にgit push

## ★ AdMob
- リワード動画はゲームオーバー後のみ（起動直後禁止）
- バナー広告は使用しない
