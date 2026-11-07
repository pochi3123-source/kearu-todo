-- ============================================================
-- ケアルTODO (Kearu TODO) - Supabase 初期セットアップSQL
-- Supabase Dashboard > SQL Editor にそのまま貼り付けて Run してください
-- ============================================================

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- 1行の超短い補足（例: "最小: 1問だけ見る", "10秒だけLogicを開く" など。長文メモは持たない）
  short_note text default '',
  -- 手続き・提出系で「最後の提出・確定までやったか」を目印表示するフラグ
  requires_submission_check boolean not null default false,
  -- true = 「今日（ウィジェット表示対象）」, false = 「控え（Backlog）」
  is_today boolean not null default true,
  -- 絶対期限がある場合のみ設定（YYYY-MM-DD）
  due_date date null,
  -- 'todo' = 未完了, 'done' = 完了（軌跡タブへ移動）
  status text not null default 'todo' check (status in ('todo', 'done')),
  -- どこから作られたか（'kearu' = 夜のケアル対話, 'android' = スマホから1秒追加）
  source text not null default 'android' check (source in ('kearu', 'android')),
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

-- よく使う検索条件のインデックス（ウィジェット表示＆軌跡表示を高速化）
create index if not exists idx_todos_status_today
  on public.todos (status, is_today, due_date);

create index if not exists idx_todos_completed_at
  on public.todos (completed_at desc);

-- Realtime購読を有効化（ケアル側で追加したらAndroid側へ即時反映）
alter publication supabase_realtime add table public.todos;

-- RLS（Row Level Security）設定
-- 個人専用アプリとして anon key でシンプルに読み書きできるようにする初期ポリシー
-- （必要に応じて Auth UID 制限に切り替え可能）
alter table public.todos enable row level security;

drop policy if exists "Allow personal read write on todos" on public.todos;
create policy "Allow personal read write on todos"
  on public.todos
  for all
  using (true)
  with check (true);

-- 初期サンプルデータ（今のケアルのリアルな最小接触＆期限タスク）
insert into public.todos (title, short_note, requires_submission_check, is_today, due_date, status, source)
values
  ('出社時に挨拶＋一言だけ話しかける', '最小: うまく話そうとせず挨拶＋一言だけ', false, true, '2026-11-05', 'todo', 'kearu'),
  ('紙ノートを開いて1行だけ字を書く', '最小: 風呂上がりにペンを持つだけ', false, true, null, 'todo', 'kearu'),
  ('Logicを開いてボーカルC案を10秒聴く', '最小: プロジェクトを開くだけでクリア', false, true, null, 'todo', 'kearu'),
  ('Windows PCの定期通知タスクを停止する', '設定画面で無効化・反映確認まで', true, false, null, 'todo', 'kearu'),
  ('応用情報・DFSの図解ページを1つ眺める', '最小: Wikiの図を1個見るだけ', false, false, null, 'todo', 'kearu');
