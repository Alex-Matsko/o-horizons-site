import { NodeSSH } from 'node-ssh';
import { query } from '../config/db.js';
import { config } from '../config/index.js';
import { notifyTelegram } from './telegram.js';
import { sendMail } from './mailer.js';

async function setStep(requestId, step, name, status, message = null) {
  await query(
    `INSERT INTO provision_steps (request_id, step, name, status, started_at, finished_at, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (request_id, step)
     DO UPDATE SET status = $4, message = $7, finished_at = $6`,
    [requestId, step, name, status,
     status === 'running' ? new Date() : null,
     status !== 'running' ? new Date() : null,
     message]
  );
}

async function updateDbStatus(dbId, status, extra = {}) {
  const parts = ['status = $2'];
  const params = [dbId, status];
  if (extra.url) { params.push(extra.url); parts.push(`url = $${params.length}`); }
  if (extra.onec_ib_name) { params.push(extra.onec_ib_name); parts.push(`onec_ib_name = $${params.length}`); }
  if (extra.db_name) { params.push(extra.db_name); parts.push(`db_name = $${params.length}`); }
  if (extra.error_message !== undefined) { params.push(extra.error_message); parts.push(`error_message = $${params.length}`); }
  await query(`UPDATE databases SET ${parts.join(', ')} WHERE id = $1`, params);
}

export async function provisionDatabase(requestId) {
  const { rows: reqRows } = await query(
    `SELECT pr.*, t.email, t.org_name, c.cf_filename, c.platform
     FROM provision_requests pr
     JOIN tenants t ON t.id = pr.tenant_id
     JOIN onec_configs c ON c.id = pr.config_id
     WHERE pr.id = $1`,
    [requestId]
  );
  if (!reqRows.length) throw new Error('Request not found');
  const req = reqRows[0];

  // Create DB record
  const { rows: dbRows } = await query(
    `INSERT INTO databases (tenant_id, config_id, name, status)
     VALUES ($1, $2, $3, 'provisioning') RETURNING id`,
    [req.tenant_id, req.config_id, req.db_alias]
  );
  const dbId = dbRows[0].id;
  await query('UPDATE provision_requests SET database_id = $1, status = \'provisioning\' WHERE id = $2', [dbId, requestId]);

  const ssh = new NodeSSH();
  const safeName = `portal_${dbId.replace(/-/g, '').substring(0, 16)}`;
  const pgDbName = `onec_${safeName}`;
  const ibName = safeName;
  const apacheUrl = `${config.onec.apacheBaseUrl}/${ibName}`;

  try {
    // STEP 1: SSH connect
    await setStep(requestId, 1, 'SSH подключение', 'running');
    await ssh.connect({
      host: config.onec.serverHost,
      username: config.onec.sshUser,
      privateKeyPath: config.onec.sshKeyPath,
    });
    await setStep(requestId, 1, 'SSH подключение', 'done');

    // STEP 2: Create PostgreSQL database
    await setStep(requestId, 2, 'Создание БД PostgreSQL', 'running');
    await ssh.execCommand(`createdb -U postgres "${pgDbName}"`);
    await setStep(requestId, 2, 'Создание БД PostgreSQL', 'done');

    // STEP 3: Load 1C configuration template
    await setStep(requestId, 3, 'Загрузка конфигурации 1С', 'running');
    const cfPath = `${config.onec.templatesPath}/${req.cf_filename}`;
    const ibPath = `"/opt/1c/infobase/${ibName}"`;
    await ssh.execCommand(`mkdir -p /opt/1c/infobase/${ibName}`);
    const loadResult = await ssh.execCommand(
      `/opt/1cv8/${req.platform}*/bin/1cv8 CREATEINFOBASE "File=${ibPath}" /DisableStartupMessages || ` +
      `/opt/1cv8/current/bin/ibcmd infobase create --db-server=localhost --db-name="${pgDbName}" ` +
      `--db-user=postgres --configuration-file="${cfPath}" --name="${ibName}"`
    );
    if (loadResult.stderr && loadResult.code !== 0) throw new Error(`1C load: ${loadResult.stderr}`);
    await setStep(requestId, 3, 'Загрузка конфигурации 1С', 'done');

    // STEP 4: Register in 1C cluster
    await setStep(requestId, 4, 'Регистрация в кластере 1С', 'running');
    const regResult = await ssh.execCommand(
      `/opt/1cv8/current/bin/rac infobase create` +
      ` --cluster=${config.onec.clusterName}` +
      ` --name="${ibName}" --descr="Portal DB ${req.db_alias}"` +
      ` --dbms=PostgreSQL --db-server=localhost --db-name="${pgDbName}"` +
      ` --db-user=postgres --security-level=0`
    );
    await setStep(requestId, 4, 'Регистрация в кластере 1С', 'done');

    // STEP 5: Publish via Apache
    await setStep(requestId, 5, 'Публикация через Apache', 'running');
    const vrdContent = `<?xml version="1.0" encoding="UTF-8"?>\n<point xmlns="http://v8.1c.ru/8.2/virtual-resource-system" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" base="/${ibName}" ib="Srvr=localhost;Ref=${ibName};" enableStandardODataInterface="true" rePublishOnIBChange="true"/>`;
    await ssh.execCommand(`echo '${vrdContent}' > /etc/apache2/sites-enabled/${ibName}.vrd`);
    await ssh.execCommand('systemctl reload apache2');
    await setStep(requestId, 5, 'Публикация через Apache', 'done');

    // STEP 6: Update DB record
    await setStep(requestId, 6, 'Финализация', 'running');
    await updateDbStatus(dbId, 'running', {
      url: apacheUrl,
      onec_ib_name: ibName,
      db_name: pgDbName,
      error_message: null,
    });
    await query('UPDATE provision_requests SET status = \'done\' WHERE id = $1', [requestId]);
    await setStep(requestId, 6, 'Финализация', 'done');

    // Notify
    await notifyTelegram(`✅ <b>База 1С успешно создана</b>\nКлиент: ${req.org_name || req.email}\nURL: ${apacheUrl}`);
    await sendMail({
      to: req.email,
      subject: 'Ваша база 1С готова — O-Horizons',
      html: `<div style="font-family:sans-serif"><h2>База готова!</h2><p>Название: <b>${req.db_alias}</b></p><p>URL для подключения: <a href="${apacheUrl}">${apacheUrl}</a></p><p>Войдите на портал для управления пользователями.</p></div>`,
    });
  } catch (err) {
    await updateDbStatus(dbId, 'error', { error_message: err.message });
    await query('UPDATE provision_requests SET status = \'failed\' WHERE id = $1', [requestId]);
    await notifyTelegram(`❌ <b>Ошибка создания базы 1С</b>\nКлиент: ${req.email}\nОшибка: ${err.message}`);
    throw err;
  } finally {
    ssh.dispose();
  }
}
