/**
 * Render: مسیر SQLite مطلق + prisma db push سپس سرور API.
 * file:./... گاهی روی Linux/Render باعث شکست db push می‌شود.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
process.chdir(root);

const prismaDir = path.join(root, 'server', 'prisma');
fs.mkdirSync(prismaDir, { recursive: true });

const rawDb = String(process.env.DATABASE_URL || '').trim();
const useAbsoluteSqlite =
  !rawDb ||
  rawDb.startsWith('file:./') ||
  rawDb === 'file:./server/prisma/dev.db';

if (useAbsoluteSqlite) {
  const dbFile = path.join(prismaDir, 'dev.db');
  process.env.DATABASE_URL = pathToFileURL(dbFile).href;
  console.log('[render-start] DATABASE_URL → absolute SQLite (dev.db under server/prisma)');
} else {
  console.log('[render-start] DATABASE_URL from env (unchanged)');
}

function runShell(label, cmd) {
  console.log(`[render-start] ${label}`);
  const r = spawnSync(cmd, {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: { ...process.env },
  });
  if (r.status !== 0) {
    console.error(`[render-start] FAILED: ${label} (exit ${r.status ?? 'unknown'})`);
    process.exit(r.status ?? 1);
  }
}

runShell('Step 1: prisma db push --accept-data-loss', 'npx prisma db push --accept-data-loss');

const indexJs = path.join(root, 'server', 'index.js');
console.log('[render-start] Step 2: API server');
const node = spawnSync(process.execPath, ['--no-warnings', indexJs], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env },
  shell: false,
});
process.exit(node.status ?? 1);
