#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
کپی فایل SQLite پلتفرم دکان‌یار به پوشهٔ backups/ (کنار ریشهٔ پروژه).

استفاده روی سرور یا ویندوز:
  set DATABASE_URL=file:./server/prisma/dev.db
  python public/scripts/backup_platform_db.py

یا از ریشهٔ repo:
  python scripts/backup_platform_db.py
"""
from __future__ import annotations

import os
import shutil
from datetime import datetime, timezone


def resolve_sqlite_path() -> str:
    raw = os.environ.get("DATABASE_URL", "file:./server/prisma/dev.db")
    rel = raw.replace("file:", "").strip()
    if rel.startswith("./"):
        rel = rel[2:]
    if os.path.isabs(rel):
        return rel
    # cwd = ریشه پروژه (جایی که سرور اجرا می‌شود)
    return os.path.abspath(os.path.join(os.getcwd(), rel))


def main() -> None:
    src = resolve_sqlite_path()
    if not os.path.isfile(src):
        raise SystemExit(f"فایل پایگاه یافت نشد: {src}")

    out_dir = os.path.join(os.getcwd(), "backups")
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dst = os.path.join(out_dir, f"dokanyar-platform_{stamp}.sqlite.db")
    shutil.copy2(src, dst)
    print(f"OK: {dst}")


if __name__ == "__main__":
    main()
