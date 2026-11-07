#!/usr/bin/env node
/**
 * ケアルTODO 同期スクリプト (Kearu <-> Supabase / ローカルJSON)
 *
 * 夜のケアル対話から、AIが1コマンドで「今日の軌跡確認」「明日の最小接触セット」を
 * Androidアプリ＆ウィジェット（Supabase）へ同期するためのCLIです。
 *
 * 使い方:
 *   node scripts/kearu-sync.mjs list
 *   node scripts/kearu-sync.mjs add "竹内さんへ一言話しかける" --note "最小: 挨拶だけでOK" --today --due 2026-11-05
 *   node scripts/kearu-sync.mjs add "勤怠を提出する" --note "入力だけでなく提出ボタンまで" --today --submit
 *   node scripts/kearu-sync.mjs done <id>
 *   node scripts/kearu-sync.mjs move <id> --today | --backlog
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../data/todos.json');
const ENV_PATH = path.resolve(__dirname, '../.env');

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env;
}

const fileEnv = loadEnv();
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  fileEnv.EXPO_PUBLIC_SUPABASE_URL ||
  fileEnv.SUPABASE_URL ||
  '';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  fileEnv.SUPABASE_ANON_KEY ||
  '';

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

function readLocal() {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function writeLocal(items) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2) + '\n', 'utf8');
}

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase API Error (${res.status}): ${text}`);
  }
  return res.json();
}

async function getAllTodos() {
  if (hasSupabase) {
    const data = await supabaseRequest('todos?select=*&order=created_at.asc');
    writeLocal(data);
    return data;
  }
  return readLocal();
}

function parseFlags(args) {
  const flags = {
    positional: [],
    note: '',
    due: null,
    today: true,
    backlog: false,
    submit: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--note' && args[i + 1]) {
      flags.note = args[++i];
    } else if (a === '--due' && args[i + 1]) {
      flags.due = args[++i];
    } else if (a === '--today') {
      flags.today = true;
      flags.backlog = false;
    } else if (a === '--backlog') {
      flags.backlog = true;
      flags.today = false;
    } else if (a === '--submit') {
      flags.submit = true;
    } else {
      flags.positional.push(a);
    }
  }
  return flags;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const flags = parseFlags(rest);

  if (!cmd || cmd === 'list') {
    const items = await getAllTodos();
    const today = items.filter((t) => t.status === 'todo' && t.is_today);
    const backlog = items.filter((t) => t.status === 'todo' && !t.is_today);
    const done = items.filter((t) => t.status === 'done');

    console.log(
      `=== ☁️ ケアルTODO (${hasSupabase ? 'Supabase同期済' : 'ローカルJSON'}) ===`
    );
    console.log(`\n【☀️ 今日（ウィジェット表示）】(${today.length}件)`);
    for (const t of today) {
      const badges = [
        t.requires_submission_check ? '[提出確認まで]' : '',
        t.due_date ? `[期限:${t.due_date}]` : '',
      ]
        .filter(Boolean)
        .join(' ');
      console.log(
        `  - [ ] (${t.id}) ${t.title} ${badges} ${t.short_note ? `｜ ${t.short_note}` : ''}`
      );
    }

    console.log(`\n【🌱 控え（Backlog）】(${backlog.length}件)`);
    for (const t of backlog) {
      console.log(
        `  - [ ] (${t.id}) ${t.title} ${t.short_note ? `｜ ${t.short_note}` : ''}`
      );
    }

    console.log(`\n【✨ 軌跡（直近の完了）】(${done.length}件)`);
    for (const t of done.slice(0, 5)) {
      console.log(
        `  - [x] (${t.id}) ${t.title} (${(t.completed_at || '').slice(0, 10)})`
      );
    }
    return;
  }

  if (cmd === 'add') {
    const title = flags.positional[0];
    if (!title) {
      console.error('エラー: タスク名を指定してください');
      process.exit(1);
    }
    const newItem = {
      id: `kearu-${Date.now()}`,
      title,
      short_note: flags.note,
      requires_submission_check: flags.submit,
      is_today: !flags.backlog,
      due_date: flags.due,
      status: 'todo',
      source: 'kearu',
      completed_at: null,
      created_at: new Date().toISOString(),
    };

    if (hasSupabase) {
      const { id, ...payload } = newItem;
      await supabaseRequest('todos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await getAllTodos();
    } else {
      const items = readLocal();
      items.unshift(newItem);
      writeLocal(items);
    }
    console.log(`✅ 追加しました: "${title}" (${newItem.is_today ? '今日' : '控え'})`);
    return;
  }

  if (cmd === 'done') {
    const targetId = flags.positional[0];
    const nowIso = new Date().toISOString();
    if (hasSupabase) {
      await supabaseRequest(`todos?id=eq.${encodeURIComponent(targetId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done', completed_at: nowIso }),
      });
      await getAllTodos();
    } else {
      const items = readLocal().map((t) =>
        t.id === targetId ? { ...t, status: 'done', completed_at: nowIso } : t
      );
      writeLocal(items);
    }
    console.log(`✨ 完了（軌跡へ記録）しました: ${targetId}`);
    return;
  }

  if (cmd === 'move') {
    const targetId = flags.positional[0];
    const nextToday = !flags.backlog;
    if (hasSupabase) {
      await supabaseRequest(`todos?id=eq.${encodeURIComponent(targetId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_today: nextToday }),
      });
      await getAllTodos();
    } else {
      const items = readLocal().map((t) =>
        t.id === targetId ? { ...t, is_today: nextToday } : t
      );
      writeLocal(items);
    }
    console.log(
      `🔄 移動しました: ${targetId} -> ${nextToday ? '☀️ 今日' : '🌱 控え'}`
    );
    return;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
