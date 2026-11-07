# ☁️ ケアルTODO (Kearu TODO) — Androidアプリ ＆ ホーム画面ウィジェット

Windows XPの壁紙（Bliss：抜けるような青空と白い雲、鮮やかな緑の草原）を背景に、**「今日触れる1〜3個（明日の最小接触）」**と**「直近の絶対期限タスク」**だけを白く透ける清潔なカードで表示する、あなた専用のTODOアプリ＆Androidウィジェットです。

---

## 🚀 0秒で画面と動きを試す（インストール不要プレビュー）

まずは以下のファイルをブラウザで開くと、**Androidホーム画面ウィジェット**と**3タブアプリ（今日 / 控え / 軌跡 ＋ 1秒追加バー）**の両方を今すぐ触って試せます。

- `apps/kearu-todo/preview.html`

---

## 🛠️ 構成ファイル一覧

- `preview.html`: Mac / スマホブラウザで今すぐ動かせる実機シミュレーター（Supabaseライブ接続対応）
- `supabase/schema.sql`: SupabaseのSQL Editorにコピペ1回でテーブル・インデックス・RLS・初期データを作るSQL
- `scripts/kearu-sync.mjs`: 夜のケアル対話からAIが1コマンドでTODOを追加・確認・移動する同期スクリプト
- `src/components/BlissBackground.tsx`: Windows XP (Bliss) 風の青空・雲・緑の丘を描画するReact Native背景コンポーネント
- `src/widget/KearuTodoWidget.tsx`: Androidホーム画面ウィジェット（`react-native-android-widget`）
- `src/widget/widget-task-handler.tsx`: ウィジェット上のチェックボックスを1タップした瞬間に完了処理するハンドラー
- `src/screens/TodoMainScreen.tsx`: 「☀️ 今日」「🌱 控え」「✨ 軌跡」の3タブ＋下部1秒追加バー画面
- `src/supabase.ts`: Supabaseクライアント＆オフライン自動フォールバック

---

## 🔗 ステップ1：Supabase（無料枠）を繋ぐ（約2分）

1. [Supabase Dashboard](https://supabase.com/dashboard) で新規プロジェクト（例: `kearu-todo`）を作成します。
2. 左メニューの **SQL Editor** を開き、`supabase/schema.sql` の中身をそのまま貼り付けて **Run** を押します。
3. **Project Settings > API** から `Project URL` と `anon public key` をコピーし、`apps/kearu-todo/.env` を作成して貼り付けます：

```env
EXPO_PUBLIC_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=あなたのanonキー
```

---

## 🌙 ステップ2：夜のケアル対話からTODOを同期する

ターミナル（またはケアルとの会話中）で以下のコマンドを実行すると、Supabaseとローカル台帳（`data/todos.json`）が同期されます：

```bash
# 現在の「今日」「控え」「軌跡」を表示
node apps/kearu-todo/scripts/kearu-sync.mjs list

# 明日の最小接触を「今日（ウィジェット）」に追加
node apps/kearu-todo/scripts/kearu-sync.mjs add "出社時に挨拶＋一言だけ話しかける" --note "最小: 挨拶だけでOK" --today --due 2026-11-05

# 提出確認が必要なタスクを追加
node apps/kearu-todo/scripts/kearu-sync.mjs add "作業実績表を提出する" --note "入力だけでなく提出ボタン確定まで" --today --submit
```

---

## 📱 ステップ3：Androidケータイへアプリ＆ウィジェットを入れる

Androidホーム画面ウィジェット（`react-native-android-widget`）はネイティブ機能を使うため、以下のコマンドでAndroid実機またはAPKとしてビルドします：

```bash
cd "/Users/hisahisa/Library/Mobile Documents/com~apple~CloudDocs/kearu/apps/kearu-todo"
npm install
npx expo prebuild --platform android
npx expo run:android
```

インストール後、Androidケータイのホーム画面を長押し ➔ **「ウィジェット」** ➔ **「ケアルTODO（今日の最小接触）」** を選んでホーム画面に配置すれば完成です！
