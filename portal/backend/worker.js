require('dotenv').config();
const { Worker } = require('bullmq');
const { NodeSSH } = require('node-ssh');
const db = require('./src/db');
const mailer = require('./src/services/mailer');

const redisConn = { host: process.env.REDIS_HOST || 'redis', port: 6379 };

// ─── PROVISION WORKER ───────────────────────────────────────────────────────
new Worker('provision', async (job) => {
  const { dbId, reqId, dbRow, reqRow } = job.data;
  const ssh = new NodeSSH();

  try {
    await db.connect();
    await db.query(`UPDATE databases_1c SET status='provisioning', updated_at=NOW() WHERE id=$1`, [dbId]);

    await ssh.connect({
      host: process.env.ONEC_SSH_HOST,
      port: parseInt(process.env.ONEC_SSH_PORT || '22'),
      username: process.env.ONEC_SSH_USER,
      privateKeyPath: process.env.ONEC_SSH_KEY_PATH,
    });

    // Step 1: Create PostgreSQL database
    const pgDb = `onec_${dbRow.db_name}`;
    await ssh.execCommand(`createdb -U postgres ${pgDb}`);

    // Step 2: Create 1C database via ibcmd
    const ibcmdPath = process.env.IBCMD_PATH || '/opt/1cv8/current/ibcmd';
    const serverAddr = process.env.ONEC_SERVER_ADDR || 'localhost';
    const createCmd = [
      `sudo -u usr1cv8 ${ibcmdPath} infobase create`,
      `--dbms=PostgreSQL`,
      `--db-server=${process.env.ONEC_PG_HOST || 'localhost'}`,
      `--db-name=${pgDb}`,
      `--db-user=${process.env.ONEC_PG_USER || 'postgres'}`,
      `--db-pwd=${process.env.ONEC_PG_PASS || ''}`,
      `--license-server=${process.env.ONEC_LICENSE_SERVER || 'localhost'}`,
      `--cluster-port=${process.env.ONEC_CLUSTER_PORT || '1541'}`,
      `--name="${dbRow.name}"`,
    ].join(' ');
    const result = await ssh.execCommand(createCmd);
    if (result.code !== 0 && result.stderr) throw new Error(`ibcmd error: ${result.stderr}`);

    // Step 3: Publish via Apache (vrd file)
    const vrdContent = `<?xml version="1.0" encoding="UTF-8"?><point xmlns="http://v8.1c.ru/8.2/virtual-resource-system" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" base="${dbRow.db_name}" ib="Srvr=${serverAddr};Ref=${pgDb};" enableStandardOData="true"></point>`;
    const vrdPath = `${process.env.APACHE_VRD_DIR || '/etc/apache2/sites-1c'}/${dbRow.db_name}.vrd`;
    await ssh.execCommand(`echo '${vrdContent}' | sudo tee ${vrdPath}`);
    await ssh.execCommand(`sudo systemctl reload apache2`);

    // Step 4: Update DB record to active
    await db.query(
      `UPDATE databases_1c SET status='active', pg_database=$1, url_path=$2, updated_at=NOW() WHERE id=$3`,
      [pgDb, dbRow.db_name, dbId]
    );

    // Step 5: Notify tenant
    const { rows: tRows } = await db.query('SELECT email FROM tenants WHERE id=$1', [reqRow.tenant_id]);
    const url = `${process.env.ONEC_PUBLIC_URL}/${dbRow.db_name}`;
    await mailer.sendDbReady(tRows[0].email, dbRow.name, url).catch(() => {});
    await db.query(
      `INSERT INTO notifications(tenant_id,type,title,body) VALUES($1,'db_ready',$2,$3)`,
      [reqRow.tenant_id, `База «${dbRow.name}» готова`, `Доступна: ${url}`]
    );

    ssh.dispose();
    console.log(`[provision] ✅ DB ${dbRow.db_name} created`);
  } catch (err) {
    console.error('[provision] ❌ Error:', err.message);
    await db.query(
      `UPDATE databases_1c SET status='error', updated_at=NOW() WHERE id=$1`, [dbId]
    ).catch(() => {});
    if (ssh.isConnected()) ssh.dispose();
    throw err;
  }
}, { connection: redisConn, concurrency: 2 });

// ─── BACKUP WORKER ──────────────────────────────────────────────────────────
new Worker('backups', async (job) => {
  const { backupId, dbRow, tenantId } = job.data;
  const ssh = new NodeSSH();

  try {
    await db.connect();
    await db.query(`UPDATE backups SET status='running', started_at=NOW() WHERE id=$1`, [backupId]);

    await ssh.connect({
      host: process.env.ONEC_SSH_HOST,
      port: parseInt(process.env.ONEC_SSH_PORT || '22'),
      username: process.env.ONEC_SSH_USER,
      privateKeyPath: process.env.ONEC_SSH_KEY_PATH,
    });

    const backupDir = process.env.BACKUP_DIR || '/var/backups/1c';
    const fileName = `${dbRow.db_name}_${Date.now()}.dt`;
    const filePath = `${backupDir}/${fileName}`;
    const ibcmdPath = process.env.IBCMD_PATH || '/opt/1cv8/current/ibcmd';

    const cmd = `sudo -u usr1cv8 ${ibcmdPath} infobase dump --data=${filePath} --infobase-user=${process.env.ONEC_ADMIN_USER} --infobase-pwd=${process.env.ONEC_ADMIN_PASS} "Srvr=localhost;Ref=${dbRow.pg_database};""}`;
    const result = await ssh.execCommand(cmd);
    if (result.code !== 0) throw new Error(`Backup failed: ${result.stderr}`);

    // Get file size
    const sizeResult = await ssh.execCommand(`du -m ${filePath} | cut -f1`);
    const sizeMb = parseInt(sizeResult.stdout.trim()) || 0;

    await db.query(
      `UPDATE backups SET status='success', file_path=$1, size_mb=$2, finished_at=NOW() WHERE id=$3`,
      [filePath, sizeMb, backupId]
    );

    const { rows: tRows } = await db.query('SELECT email FROM tenants WHERE id=$1', [tenantId]);
    await mailer.sendBackupReady(tRows[0].email, dbRow.name, sizeMb).catch(() => {});

    ssh.dispose();
    console.log(`[backup] ✅ ${fileName} (${sizeMb}MB)`);
  } catch (err) {
    console.error('[backup] ❌', err.message);
    await db.query(
      `UPDATE backups SET status='error', error=$1, finished_at=NOW() WHERE id=$2`,
      [err.message, backupId]
    ).catch(() => {});
    if (ssh.isConnected()) ssh.dispose();
    throw err;
  }
}, { connection: redisConn, concurrency: 3 });

console.log('🚀 Workers started: provision + backups');
