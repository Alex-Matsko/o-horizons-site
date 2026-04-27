'use strict';

const { NodeSSH }    = require('node-ssh');
const { config }     = require('../config/index.js');
const { notifyTelegram } = require('./telegram.js');

/**
 * Создаёт резервную копию базы 1С через SSH + pg_dump
 * @param {object} params
 * @param {string} params.dbId          - UUID базы в портале
 * @param {string} params.pgDbName      - имя PostgreSQL базы
 * @param {string} params.tenantEmail   - email клиента
 * @param {object} pool                 - pg Pool портала
 */
async function createBackup({ dbId, pgDbName, tenantEmail }, pool) {
  const ssh       = new NodeSSH();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName  = `backup_${pgDbName}_${timestamp}.dump`;
  const remotePath = `${config.backups.localPath}/${fileName}`;

  try {
    await ssh.connect({
      host:           config.onec.serverHost,
      username:       config.onec.sshUser,
      privateKeyPath: config.onec.sshKeyPath,
    });

    // pg_dump создаёт binary dump
    const result = await ssh.execCommand(
      `pg_dump -U postgres -Fc "${pgDbName}" -f "${remotePath}"`
    );
    if (result.code !== 0 && result.stderr) {
      throw new Error(`pg_dump failed: ${result.stderr}`);
    }

    // Записываем в БД портала
    await pool.query(
      `INSERT INTO backups (database_id, file_name, file_path, status, size_bytes)
       VALUES ($1, $2, $3, 'completed',
         (SELECT COALESCE((SELECT size FROM (
           SELECT pg_database_size($4) AS size
         ) s), 0))
       )`,
      [dbId, fileName, remotePath, pgDbName]
    );

    await notifyTelegram(
      `✅ <b>Бекап готов</b>\nКлиент: ${tenantEmail}\nФайл: ${fileName}`
    );

    return { fileName, remotePath };
  } catch (err) {
    await pool.query(
      `INSERT INTO backups (database_id, file_name, file_path, status, error_message)
       VALUES ($1, $2, $3, 'failed', $4)`,
      [dbId, fileName, remotePath, err.message]
    ).catch(() => {});

    await notifyTelegram(
      `❌ <b>Ошибка бекапа</b>\nКлиент: ${tenantEmail}\n${err.message}`
    );
    throw err;
  } finally {
    ssh.dispose();
  }
}

module.exports = { createBackup };
