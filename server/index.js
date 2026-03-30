import 'dotenv/config';
import app from './app.js';
import { copyPlatformDatabase } from './backupPlatformDb.js';

const port = Number(process.env.PORT || 4000);

const autoBackupHours = Number(process.env.AUTO_BACKUP_INTERVAL_HOURS || 0);
if (autoBackupHours > 0) {
  const tick = async () => {
    try {
      const p = await copyPlatformDatabase();
      console.log('[auto-backup] OK', p);
    } catch (e) {
      console.error('[auto-backup]', e?.message || e);
    }
  };
  setInterval(tick, autoBackupHours * 3600_000);
  void tick();
}

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
