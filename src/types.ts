export type TodoStatus = 'todo' | 'done';
export type TodoSource = 'kearu' | 'android';
export type ActiveTab = 'today' | 'backlog' | 'done';

export interface TodoItem {
  id: string;
  title: string;
  /** 1行の超短い補足（最小の触れ方など。長文メモは持たない） */
  short_note: string;
  /** 手続き・提出系で「提出・反映確認まで」を目印表示するかどうか */
  requires_submission_check: boolean;
  /** true = 今日触れる（ウィジェット表示対象）, false = 控え（Backlog） */
  is_today: boolean;
  /** YYYY-MM-DD（絶対期限がある場合のみ） */
  due_date: string | null;
  status: TodoStatus;
  source: TodoSource;
  completed_at: string | null;
  created_at: string;
}
