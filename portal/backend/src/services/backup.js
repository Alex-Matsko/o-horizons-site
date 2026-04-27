import { NodeSSH } from 'node-ssh';
import { query } from '../config/db.js';
import { config } from '../config/index.js';
import { notifyTelegram } from './telegram.js';
import dayjs from 'dayjs';

export async function runBackup(backupId) {
  const { rows: bkRows } = await query(
    `SELECT b.*, d.onec_ib_name, d.db_name, t.email
     FROM backups b
     JOIN databases d ON d.id = b.database_id
     JOIN tenants t ON t.id = b.tenant_id
     WHERE b.id = $1`,
    [backupId]
  );
  if (!bkRows.length) throw new Error('Backup not found');
  const b = bkRows[0];

  await query('UPDATE backups SET status = \'running\' WHERE id = $1', [backupId]);

  const ssh = new NodeSSH();
  const ts = dayjs().format('YYYYMMDD_HHmmss');
  const filename = `${b.db_name}_${ts}.backup`;
  const remotePath = `/tmp/${filename}`;
  const localPath = `${config.backups.localPath}/${filename}`;

  try {
    await ssh.connect({
      host: config.onec.serverHost,
      username: config.onec.sshUser,
      privateKeyPath: config.onec.sshKeyPath,
    });

    const res = await ssh.execCommand(
      `pg_dump -U postgres -Fc "${b.db_name}" -f "${remotePath}"`
    );
    if (res.code !== 0) throw new Error(`pg_dump: ${res.stderr}`);

    await ssh.getFile(localPath, remotePath);
    await ssh.execCommand(`rm "${remotePath}"`);

    const { size } = await import('fs').then(fs => fs.promises.stat(localPath));
    const expires = dayjs().add(config.backups.retentionDays, 'day').toDate();

    await query(
      `UPDATE backups SET status = 'done', file_path = $2, file_size = $3, finished_at = NOW(), expires_at = $4 WHERE id = $1`,
      [backupId, localPath, size, expires]
    );
  } catch (err) {
    await query('UPDATE backups SET status = \'failed\', error = $2, finished_at = NOW() WHERE id = $1', [backupId, err.message]);
    await notifyTelegram(`❌ <b>Ошибка бекапа</b>\nБаза: ${b.onec_ib_name}\nОшибка: ${err.message}`);
    throw err;
  } finally {
    ssh.dispose();
  }
}

export async function cleanupExpiredBackups() {
  const { rows } = await query(
    `SELECT id, file_path FROM backups WHERE expires_at < NOW() AND status = 'done'`
  );
  const { unlink } = await import('fs').then(m => m.promises);
  for (const row of rows) {
    try { await unlink(row.file_path); } catch {}
    await query('DELETE FROM backups WHERE id = $1', [row.id]);
  }
  console.log(`[Backup] Cleaned up ${rows.length} expired backups`);
}
