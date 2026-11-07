import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { TodoItem } from './types';

// 環境変数（.env）に EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY を設定すると自動でSupabaseへ接続します。
// 未設定の間もすぐ触れるよう、ローカル（AsyncStorage）へ自動フォールバックします。
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

const LOCAL_STORAGE_KEY = '@kearu_todo_items_v1';

export const INITIAL_SAMPLE_TODOS: TodoItem[] = [
  {
    id: 'kearu-1',
    title: '出社時に挨拶＋一言だけ話しかける',
    short_note: '最小: うまく話そうとせず挨拶＋一言だけ',
    requires_submission_check: false,
    is_today: true,
    due_date: '2026-11-05',
    status: 'todo',
    source: 'kearu',
    completed_at: null,
    created_at: '2026-11-04T23:00:00+09:00',
  },
  {
    id: 'kearu-2',
    title: '紙ノートを開いて1行だけ字を書く',
    short_note: '最小: 風呂上がりにペンを持つだけ',
    requires_submission_check: false,
    is_today: true,
    due_date: null,
    status: 'todo',
    source: 'kearu',
    completed_at: null,
    created_at: '2026-11-04T23:05:00+09:00',
  },
  {
    id: 'kearu-3',
    title: 'Logicを開いてボーカルC案を10秒聴く',
    short_note: '最小: プロジェクトを開くだけでクリア',
    requires_submission_check: false,
    is_today: true,
    due_date: null,
    status: 'todo',
    source: 'kearu',
    completed_at: null,
    created_at: '2026-11-04T23:10:00+09:00',
  },
  {
    id: 'kearu-4',
    title: 'Windows PCの定期通知タスクを停止する',
    short_note: '設定画面で無効化・停止反映の確認まで',
    requires_submission_check: true,
    is_today: false,
    due_date: null,
    status: 'todo',
    source: 'kearu',
    completed_at: null,
    created_at: '2026-11-04T23:15:00+09:00',
  },
  {
    id: 'kearu-5',
    title: '応用情報・DFSの図解ページを1つ眺める',
    short_note: '最小: Wikiの図を1個見るだけ',
    requires_submission_check: false,
    is_today: false,
    due_date: null,
    status: 'todo',
    source: 'kearu',
    completed_at: null,
    created_at: '2026-11-04T23:20:00+09:00',
  },
  {
    id: 'kearu-done-1',
    title: 'ケアルのシンプル運用（通知ゼロ・夜1回対話）を決める',
    short_note: '最小: 残す機能3つを整理する',
    requires_submission_check: false,
    is_today: true,
    due_date: null,
    status: 'done',
    source: 'kearu',
    completed_at: '2026-11-04T22:50:00+09:00',
    created_at: '2026-11-04T22:00:00+09:00',
  },
];

export async function loadLocalTodos(): Promise<TodoItem[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_TODOS));
      return INITIAL_SAMPLE_TODOS;
    }
    return JSON.parse(raw) as TodoItem[];
  } catch {
    return INITIAL_SAMPLE_TODOS;
  }
}

export async function saveLocalTodos(items: TodoItem[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

export async function fetchTodos(): Promise<TodoItem[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (!error && data) {
      await saveLocalTodos(data as TodoItem[]);
      return data as TodoItem[];
    }
  }
  return loadLocalTodos();
}

export async function createTodoItem(input: {
  title: string;
  short_note?: string;
  requires_submission_check?: boolean;
  is_today?: boolean;
  due_date?: string | null;
}): Promise<TodoItem[]> {
  const newItem: TodoItem = {
    id: `local-${Date.now()}`,
    title: input.title.trim(),
    short_note: (input.short_note || '').trim(),
    requires_submission_check: Boolean(input.requires_submission_check),
    is_today: input.is_today ?? true,
    due_date: input.due_date || null,
    status: 'todo',
    source: 'android',
    completed_at: null,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from('todos').insert({
      title: newItem.title,
      short_note: newItem.short_note,
      requires_submission_check: newItem.requires_submission_check,
      is_today: newItem.is_today,
      due_date: newItem.due_date,
      status: 'todo',
      source: 'android',
    });
    if (!error) {
      return fetchTodos();
    }
  }

  const current = await loadLocalTodos();
  const next = [newItem, ...current];
  await saveLocalTodos(next);
  return next;
}

export async function markTodoDone(id: string): Promise<TodoItem[]> {
  const nowIso = new Date().toISOString();
  if (supabase) {
    const { error } = await supabase
      .from('todos')
      .update({ status: 'done', completed_at: nowIso })
      .eq('id', id);
    if (!error) {
      return fetchTodos();
    }
  }

  const current = await loadLocalTodos();
  const next = current.map((item) =>
    item.id === id ? { ...item, status: 'done' as const, completed_at: nowIso } : item
  );
  await saveLocalTodos(next);
  return next;
}

export async function reopenTodo(id: string): Promise<TodoItem[]> {
  if (supabase) {
    const { error } = await supabase
      .from('todos')
      .update({ status: 'todo', completed_at: null })
      .eq('id', id);
    if (!error) {
      return fetchTodos();
    }
  }

  const current = await loadLocalTodos();
  const next = current.map((item) =>
    item.id === id ? { ...item, status: 'todo' as const, completed_at: null } : item
  );
  await saveLocalTodos(next);
  return next;
}

export async function toggleTodoToday(id: string, isToday: boolean): Promise<TodoItem[]> {
  if (supabase) {
    const { error } = await supabase
      .from('todos')
      .update({ is_today: isToday })
      .eq('id', id);
    if (!error) {
      return fetchTodos();
    }
  }

  const current = await loadLocalTodos();
  const next = current.map((item) =>
    item.id === id ? { ...item, is_today: isToday } : item
  );
  await saveLocalTodos(next);
  return next;
}

/**
 * ウィジェットと「今日」タブに表示する項目だけを抽出する
 * - 未完了（status === 'todo'）
 * - 「今日触れる（is_today === true）」または「直近7日以内の絶対期限（due_date）があるもの」
 */
export function selectTodayWidgetTodos(items: TodoItem[]): TodoItem[] {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return items
    .filter((item) => {
      if (item.status !== 'todo') return false;
      if (item.is_today) return true;
      if (item.due_date && item.due_date <= sevenDaysLater) return true;
      return false;
    })
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
}
