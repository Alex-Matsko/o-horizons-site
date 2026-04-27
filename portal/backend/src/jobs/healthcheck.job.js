import { Worker, Queue } from 'bullmq';
import { redis } from '../config/redis.js';
import { query } from '../config/db.js';
import { sendTelegram } from '../services/telegram.service.js';
import { logger } from '../utils/logger.js';

export function healthcheckWorker() {
  // Schedule repeating healthchecks every 5 min
  const healthQueue = new Queue('health', { connection: redis });
  healthQueue.add('run', {}, { repeat: { every: 5 * 60 * 1000 }, removeOnComplete: 10 });

  const worker = new Worker('health', async () => {
    const { rows: dbs } = await query(
      `SELECT id, name, public_url FROM databases WHERE status='ACTIVE' AND public_url IS NOT NULL`
    );

    for (const db of dbs) {
      const start = Date.now();
      let status = 'DOWN';
      let responseTime = null;

      try {
        const res = await fetch(db.public_url, { signal: AbortSignal.timeout(10000) });
        responseTime = Date.now() - start;
        // 1C returns 200 or 302 for published bases
        status = res.status < 500 ? 'UP' : 'DOWN';
      } catch {
        status = 'DOWN';
      }

      // Save history
      await query(
        `INSERT INTO healthcheck_history (database_id, status, response_time_ms) VALUES ($1,$2,$3)`,
        [db.id, status, responseTime]
      );

      // Check previous status — alert only on change to DOWN
      const { rows: prev } = await query(
        `SELECT status FROM healthcheck_history WHERE database_id=$1 ORDER BY checked_at DESC LIMIT 2`,
        [db.id]
      );
      const wasUp = prev[1]?.status === 'UP';
      if (status === 'DOWN' && wasUp) {
        await sendTelegram(`🔴 <b>База недоступна:</b> <code>${db.name}</code>\nURL: ${db.public_url}`);
      }
      if (status === 'UP' && prev[1]?.status === 'DOWN') {
        await sendTelegram(`🟢 <b>База восстановлена:</b> <code>${db.name}</code>`);
      }

      await query(
        `UPDATE databases SET healthcheck_status=$1, last_healthcheck_at=NOW() WHERE id=$2`,
        [status, db.id]
      );
    }
    logger.info(`[healthcheck] Checked ${dbs.length} databases`);
  }, { connection: redis, concurrency: 1 });

  return worker;
}
