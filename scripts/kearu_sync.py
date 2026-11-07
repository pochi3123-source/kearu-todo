#!/usr/bin/env python3
"""
ケアルTODO 同期スクリプト (Python標準ライブラリ版 / Node不要・双方向自動同期対応)

使い方:
  python3 apps/kearu-todo/scripts/kearu_sync.py sync
      -> スマホ(Supabase)の最新状態を取得し、ケアル側の台帳(data/todos.json, TaskNotes/Tasks/, personal-os/02_tasks/today.md)へ自動反映する
  python3 apps/kearu-todo/scripts/kearu_sync.py list
  python3 apps/kearu-todo/scripts/kearu_sync.py add "タスク名" --note "最小: 挨拶だけでOK" --today --due 2026-11-05
  python3 apps/kearu-todo/scripts/kearu_sync.py add "作業実績表を提出する" --note "提出ボタン確定まで" --today --submit
  python3 apps/kearu-todo/scripts/kearu_sync.py done <id>
  python3 apps/kearu-todo/scripts/kearu_sync.py move <id> --today | --backlog
"""

import argparse
import datetime
import json
import os
import pathlib
import urllib.parse
import urllib.request

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
VAULT_DIR = BASE_DIR.parent.parent
DATA_PATH = BASE_DIR / "data" / "todos.json"
ENV_PATH = BASE_DIR / ".env"
KEY_TXT_PATH = BASE_DIR / "supabase-key.txt"
KIOKU_TODAY_PATH = pathlib.Path("/Users/hisahisa/Documents/New project/personal-os/02_tasks/today.md")
KIOKU_BACKLOG_PATH = pathlib.Path("/Users/hisahisa/Documents/New project/personal-os/02_tasks/backlog.md")


def load_env():
    env = {}
    for p in (ENV_PATH, KEY_TXT_PATH):
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                val = v.strip().strip("'\"")
                if val:
                    env[k.strip()] = val
    if "KEY" in env and "EXPO_PUBLIC_SUPABASE_ANON_KEY" not in env:
        env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] = env["KEY"]
    return env


FILE_ENV = load_env()
SUPABASE_URL = (
    os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
    or os.environ.get("SUPABASE_URL")
    or FILE_ENV.get("EXPO_PUBLIC_SUPABASE_URL")
    or FILE_ENV.get("SUPABASE_URL")
    or ""
)
SUPABASE_KEY = (
    os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or FILE_ENV.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    or FILE_ENV.get("SUPABASE_ANON_KEY")
    or ""
)
HAS_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)


def read_local():
    if not DATA_PATH.exists():
        return []
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


def write_local(items):
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    export_markdown_mirrors(items)


def export_markdown_mirrors(items):
    """
    ケアル側のMarkdown台帳（personal-os/02_tasks/today.md & backlog.md）にも
    Supabaseの最新状態をミラー書き出しする（どのAIから読んでも最新がわかるようにする）
    """
    today_str = datetime.date.today().isoformat()
    today_items = [t for t in items if t.get("status") == "todo" and t.get("is_today")]
    backlog_items = [t for t in items if t.get("status") == "todo" and not t.get("is_today")]

    if KIOKU_TODAY_PATH.parent.exists():
        lines = [
            "# Today",
            "",
            "<!-- personal-os:auto:start -->",
            f"更新日: {today_str} (ケアルTODOアプリ Supabase同期済)",
            "",
            "## 今日やること（ウィジェット表示）",
            "",
        ]
        for t in today_items:
            lines.append(f"- [ ] {t['title']}")
            if t.get("short_note"):
                lines.append(f"  - 最小接触/補足: {t['short_note']}")
            if t.get("due_date"):
                lines.append(f"  - 期限: {t['due_date']}")
            if t.get("requires_submission_check"):
                lines.append("  - 確認: 提出・反映確認まで")
        lines.extend([
            "",
            "## 完了の確認",
            "",
            "- [ ] 実行しただけでなく、必要な提出・確定・反映まで確認した。",
            "<!-- personal-os:auto:end -->",
            "",
        ])
        KIOKU_TODAY_PATH.write_text("\n".join(lines), encoding="utf-8")

    if KIOKU_BACKLOG_PATH.parent.exists():
        blines = [
            "# Backlog",
            "",
            "<!-- personal-os:auto:start -->",
            f"更新日: {today_str} (ケアルTODOアプリ Supabase同期済)",
            "",
            "## 控え（明日以降の候補）",
            "",
        ]
        for t in backlog_items:
            blines.append(f"- [ ] {t['title']}")
            if t.get("short_note"):
                blines.append(f"  - 最小接触/補足: {t['short_note']}")
            if t.get("due_date"):
                blines.append(f"  - 期限: {t['due_date']}")
        blines.append("<!-- personal-os:auto:end -->\n")
        KIOKU_BACKLOG_PATH.write_text("\n".join(blines), encoding="utf-8")


def supabase_request(endpoint, method="GET", payload=None):
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_all_todos():
    if HAS_SUPABASE:
        data = supabase_request("todos?select=*&order=created_at.asc")
        write_local(data)
        return data
    items = read_local()
    export_markdown_mirrors(items)
    return items


def cmd_list():
    items = get_all_todos()
    today = [t for t in items if t.get("status") == "todo" and t.get("is_today")]
    backlog = [t for t in items if t.get("status") == "todo" and not t.get("is_today")]
    done = sorted(
        [t for t in items if t.get("status") == "done"],
        key=lambda x: x.get("completed_at") or "",
        reverse=True,
    )

    mode_str = "Supabase同期済" if HAS_SUPABASE else "ローカルJSON"
    print(f"=== ☁️ ケアルTODO ({mode_str}) ===")
    print(f"\n【☀️ 今日（ウィジェット表示）】({len(today)}件)")
    for t in today:
        badges = []
        if t.get("requires_submission_check"):
            badges.append("[提出・反映確認まで]")
        if t.get("due_date"):
            badges.append(f"[期限:{t['due_date']}]")
        badge_str = (" " + " ".join(badges)) if badges else ""
        note_str = f" ｜ {t['short_note']}" if t.get("short_note") else ""
        print(f"  - [ ] ({t['id']}) {t['title']}{badge_str}{note_str}")

    print(f"\n【🌱 控え（Backlog）】({len(backlog)}件)")
    for t in backlog:
        note_str = f" ｜ {t['short_note']}" if t.get("short_note") else ""
        print(f"  - [ ] ({t['id']}) {t['title']}{note_str}")

    print(f"\n【✨ 軌跡（完了した履歴）】({len(done)}件)")
    for t in done[:10]:
        comp_date = (t.get("completed_at") or "")[:10]
        print(f"  - [x] ({t['id']}) {t['title']} ({comp_date})")


def main():
    parser = argparse.ArgumentParser(description="ケアルTODO 同期CLI")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("list")
    sub.add_parser("sync")

    p_add = sub.add_parser("add")
    p_add.add_argument("title", help="タスク名")
    p_add.add_argument("--note", default="", help="1行補足（最小の触れ方など）")
    p_add.add_argument("--due", default=None, help="期限 YYYY-MM-DD")
    p_add.add_argument("--today", action="store_true", default=True)
    p_add.add_argument("--backlog", action="store_true", default=False)
    p_add.add_argument("--submit", action="store_true", default=False)

    p_done = sub.add_parser("done")
    p_done.add_argument("id", help="完了にするタスクID")

    p_move = sub.add_parser("move")
    p_move.add_argument("id", help="移動するタスクID")
    p_move.add_argument("--today", action="store_true", default=False)
    p_move.add_argument("--backlog", action="store_true", default=False)

    args = parser.parse_args()

    if not args.cmd or args.cmd in ("list", "sync"):
        cmd_list()
        return

    now_iso = datetime.datetime.now(datetime.timezone.utc).astimezone().isoformat()

    if args.cmd == "add":
        is_today = not args.backlog
        new_item = {
            "id": f"kearu-{int(datetime.datetime.now().timestamp() * 1000)}",
            "title": args.title,
            "short_note": args.note,
            "requires_submission_check": bool(args.submit),
            "is_today": is_today,
            "due_date": args.due,
            "status": "todo",
            "source": "kearu",
            "completed_at": None,
            "created_at": now_iso,
        }
        if HAS_SUPABASE:
            payload = {k: v for k, v in new_item.items() if k != "id"}
            supabase_request("todos", method="POST", payload=payload)
            get_all_todos()
        else:
            items = read_local()
            items.insert(0, new_item)
            write_local(items)
        target_label = "☀️ 今日" if is_today else "🌱 控え"
        print(f'✅ 追加しました: "{args.title}" ({target_label})')
        return

    if args.cmd == "done":
        if HAS_SUPABASE:
            q = urllib.parse.quote(args.id)
            supabase_request(
                f"todos?id=eq.{q}",
                method="PATCH",
                payload={"status": "done", "completed_at": now_iso},
            )
            get_all_todos()
        else:
            items = read_local()
            for t in items:
                if t.get("id") == args.id:
                    t["status"] = "done"
                    t["completed_at"] = now_iso
            write_local(items)
        print(f"✨ 完了（軌跡へ記録）しました: {args.id}")
        return

    if args.cmd == "move":
        to_today = not args.backlog
        if HAS_SUPABASE:
            q = urllib.parse.quote(args.id)
            supabase_request(
                f"todos?id=eq.{q}",
                method="PATCH",
                payload={"is_today": to_today},
            )
            get_all_todos()
        else:
            items = read_local()
            for t in items:
                if t.get("id") == args.id:
                    t["is_today"] = to_today
            write_local(items)
        target_label = "☀️ 今日" if to_today else "🌱 控え"
        print(f"🔄 移動しました: {args.id} -> {target_label}")


if __name__ == "__main__":
    main()
