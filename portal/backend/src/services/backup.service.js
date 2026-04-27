'use strict';

const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);

const BACKUP_DIR = process.env.BACKUP_PATH || '/opt/1c-backups';
const SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/backup-db.sh');

async function runBackup({ slug, dbName, dbHost, dbUser, dbPass }) {
  const env = {
    ...process.env,
    SLUG: slug,
    DB_NAME: dbName,
    DB_HOST: dbHost || 'localhost',
    DB_USER: dbUser,
    DB_PASS: dbPass,
    BACKUP_DIR,
  };

  const { stdout } = await execAsync(`bash "${SCRIPT_PATH}"`, { env, timeout: 600000 });

  // Парсим результат
  const fileMatch = stdout.match(/BACKUP_FILE=(.+)/);
  const sizeMatch = stdout.match(/FILE_SIZE=(\d+)/);

  return {
    filePath: fileMatch?.[1]?.trim(),
    fileSize: sizeMatch ? Number(sizeMatch[1]) : null,
  };
}

module.exports = { runBackup };
