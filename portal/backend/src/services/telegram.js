import { config } from '../config/index.js';

async function send(text) {
  if (!config.telegram.token || !config.telegram.adminChatId) return;
  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegram.adminChatId,
      text,
      parse_mode: 'HTML',
    }),
  }).catch((err) => console.error('[Telegram]', err.message));
}

export const telegram = {
  newProvisionRequest(tenant, dbAlias, configName) {
    send(`🆕 <b>Новая заявка на базу</b>\n👤 ${tenant.email}\n🏢 ${tenant.org_name || '—'}\n📦 ${dbAlias} (${configName})\n\n👉 Подтвердите в <a href="${config.appUrl}/admin/requests">Админ-панели</a>`);
  },
  provisionSuccess(tenant, dbName) {
    send(`✅ <b>База создана</b>\n👤 ${tenant.email}\n📦 ${dbName}`);
  },
  provisionError(requestId, step, error) {
    send(`❌ <b>Ошибка провиженинга</b>\nЗаявка: <code>${requestId}</code>\nШаг: ${step}\n${error}`);
  },
  dbDown(dbName, tenantEmail) {
    send(`🔴 <b>База недоступна!</b>\n📦 ${dbName}\n👤 ${tenantEmail}`);
  },
  dbRestored(dbName) {
    send(`🟢 <b>База восстановлена</b>\n📦 ${dbName}`);
  },
};
