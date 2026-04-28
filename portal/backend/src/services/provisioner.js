'use strict';

const { NodeSSH }         = require('node-ssh');
const { config }          = require('../config/index.js');
const { notifyTelegram }  = require('./telegram.js');
const mailer              = require('./mailer.js');  // named exports: sendDbReady, etc.

async function setStep(pool, requestId, step, name, status, message = null) {
  await pool.query(
    `INSERT INTO provision_steps (request_id, step, name, status, started_at, finished_at, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (request_id, step)
     DO UPDATE SET status = $4, message = $7, finished_at = $6`,
    [
      requestId, step, name, status,
      status === 'running' ? new Date() : null,
      status !== 'running' ? new Date() : null,
      message,
    ]
  );
}

async function updateDbStatus(pool, dbId, status, extra = {}) {
  const parts  = ['status = $2'];
  const params = [dbId, status];
  if (extra.url !== undefined)           { params.push(extra.url);           parts.push(`url = $${params.length}`); }
  if (extra.onec_ib_name !== undefined)  { params.push(extra.onec_ib_name);  parts.push(`onec_ib_name = $${params.length}`); }
  if (extra.db_name !== undefined)       { params.push(extra.db_name);       parts.push(`db_name = $${params.length}`); }
  if (extra.error_message !== undefined) { params.push(extra.error_message); parts.push(`error_message = $${params.length}`); }
  await pool.query(`UPDATE databases SET ${parts.join(', ')} WHERE id = $1`, params);
}

async function provisionDatabase(pool, requestId) {
  // Загружаем заявку + данные тенанта + конфигурацию
  const { rows: reqRows } = await pool.query(
    `SELECT pr.*,
            t.email, t.org_name,
            c.cf_filename, c.platform
     FROM provision_requests pr
     JOIN tenants      t ON t.id = pr.tenant_id
     JOIN onec_configs c ON c.id = pr.config_id
     WHERE pr.id = $1`,
    [requestId]
  );
  if (!reqRows.length) throw new Error('Provision request not found: ' + requestId);
  const req = reqRows[0];

  // Создаём запись базы в portal DB
  const { rows: dbRows } = await pool.query(
    `INSERT INTO databases (tenant_id, config_id, name, status)
     VALUES ($1, $2, $3, 'provisioning') RETURNING id`,
    [req.tenant_id, req.config_id, req.db_alias]
  );
  const dbId = dbRows[0].id;

  await pool.query(
    `UPDATE provision_requests SET database_id = $1, status = 'provisioning' WHERE id = $2`,
    [dbId, requestId]
  );

  const ssh       = new NodeSSH();
  // Безопасное имя для PG / ibcmd (UUID без дефисов, 16 символов)
  const safeName  = 'p_' + dbId.replace(/-/g, '').substring(0, 16);
  const pgDbName  = 'onec_' + safeName;
  const ibName    = safeName;
  const apacheUrl = `${config.onec.apacheBaseUrl}/${ibName}`;

  try {
    // ШАГ 1: SSH
    await setStep(pool, requestId, 1, 'SSH подключение', 'running');
    await ssh.connect({
      host:           config.onec.serverHost,
      username:       config.onec.sshUser,
      privateKeyPath: config.onec.sshKeyPath,
    });
    await setStep(pool, requestId, 1, 'SSH подключение', 'done');

    // ШАГ 2: Создание БД PostgreSQL
    await setStep(pool, requestId, 2, 'Создание БД PostgreSQL', 'running');
    const pgResult = await ssh.execCommand(`createdb -U postgres "${pgDbName}"`);
    if (pgResult.code !== 0 && pgResult.stderr) {
      throw new Error(`createdb: ${pgResult.stderr}`);
    }
    await setStep(pool, requestId, 2, 'Создание БД PostgreSQL', 'done');

    // ШАГ 3: Загрузка конфигурации 1С
    await setStep(pool, requestId, 3, 'Загрузка конфигурации 1С', 'running');
    const cfPath     = `${config.onec.templatesPath}/${req.cf_filename}`;
    const loadResult = await ssh.execCommand(
      `/opt/1cv8/current/bin/ibcmd infobase create` +
      ` --db-server=localhost --db-name="${pgDbName}"` +
      ` --db-user=postgres` +
      ` --configuration-file="${cfPath}"` +
      ` --name="${ibName}"`
    );
    if (loadResult.code !== 0 && loadResult.stderr) {
      throw new Error(`ibcmd create: ${loadResult.stderr}`);
    }
    await setStep(pool, requestId, 3, 'Загрузка конфигурации 1С', 'done');

    // ШАГ 4: Регистрация в кластере 1С
    await setStep(pool, requestId, 4, 'Регистрация в кластере 1С', 'running');
    const regResult = await ssh.execCommand(
      `/opt/1cv8/current/bin/rac infobase create` +
      ` --cluster=${config.onec.clusterName}` +
      ` --name="${ibName}"` +
      ` --descr="Portal: ${req.db_alias}"` +
      ` --dbms=PostgreSQL --db-server=localhost --db-name="${pgDbName}"` +
      ` --db-user=postgres --security-level=0`
    );
    if (regResult.code !== 0 && regResult.stderr) {
      // rac может писать в stderr даже при успехе — логируем, но не падаем
      console.warn('[provisioner] rac stderr (non-fatal):', regResult.stderr);
    }
    await setStep(pool, requestId, 4, 'Регистрация в кластере 1С', 'done');

    // ШАГ 5: Публикация через Apache (VRD файл)
    await setStep(pool, requestId, 5, 'Публикация через Apache', 'running');
    const vrdContent = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<point xmlns="http://v8.1c.ru/8.2/virtual-resource-system"`,
      `  base="/${ibName}"`,
      `  ib="Srvr=localhost;Ref=${ibName};"`,
      `  enableStandardODataInterface="true"`,
      `  rePublishOnIBChange="true"/>`,
    ].join('\n');
    // Используем printf вместо echo/heredoc — надёжнее с спецсимволами XML
    const escapedVrd = vrdContent.replace(/'/g, "'\\''")
    await ssh.execCommand(
      `printf '%s' '${escapedVrd}' > /etc/apache2/sites-enabled/${ibName}.vrd`
    );
    await ssh.execCommand('systemctl reload apache2');
    await setStep(pool, requestId, 5, 'Публикация через Apache', 'done');

    // ШАГ 6: Финализация
    await setStep(pool, requestId, 6, 'Финализация', 'running');
    await updateDbStatus(pool, dbId, 'running', {
      url:           apacheUrl,
      onec_ib_name:  ibName,
      db_name:       pgDbName,
      error_message: null,
    });
    await pool.query(
      `UPDATE provision_requests SET status = 'done' WHERE id = $1`,
      [requestId]
    );
    await setStep(pool, requestId, 6, 'Финализация', 'done');

    // Уведомления
    await notifyTelegram(
      `✅ <b>База 1С создана</b>\n` +
      `Клиент: ${req.org_name || req.email}\n` +
      `Название: ${req.db_alias}\n` +
      `URL: ${apacheUrl}`
    );
    // Используем mailer.sendDbReady (нормальное HTML-письмо с кнопкой)
    await mailer.sendDbReady(req.email, req.db_alias, apacheUrl);

  } catch (err) {
    await updateDbStatus(pool, dbId, 'error', { error_message: err.message });
    await pool.query(
      `UPDATE provision_requests SET status = 'failed' WHERE id = $1`,
      [requestId]
    );
    await notifyTelegram(
      `❌ <b>Ошибка создания базы</b>\n` +
      `Клиент: ${req.org_name || req.email}\n` +
      `${err.message}`
    );
    throw err;
  } finally {
    ssh.dispose();
  }
}

module.exports = { provisionDatabase };
