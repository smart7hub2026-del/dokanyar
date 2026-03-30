import fs from 'fs/promises';
import path from 'path';

/**
 * مسیر مطلق فایل SQLite پلتفرم از DATABASE_URL (همان منطق کپی بکاپ).
 */
export function resolvePlatformSqlitePath() {
  const raw = process.env.DATABASE_URL || 'file:./server/prisma/dev.db';
  const rel = raw.replace(/^file:/, '').replace(/^\.\//, '');
  return path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel);
}

/**
 * کپی فایل SQLite پلتفرم به server/backups/ (بدون توقف سرویس؛ برای SQLite تک‌فایل معمولاً کافی است).
 */
export async function copyPlatformDatabase() {
  const src = resolvePlatformSqlitePath();
  await fs.access(src);
  const dir = path.join(process.cwd(), 'server', 'backups');
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(dir, `platform-${stamp}.db`);
  await fs.copyFile(src, dest);
  return dest;
}
