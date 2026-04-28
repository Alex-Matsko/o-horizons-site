// УСТАРЕЛ — используй telegram.service.js (ESM)
// Этот файл оставлен для обратной совместимости с CJS-кодом (provisioner.js)
'use strict';

const { config } = (() => {
  // Ленивый импорт конфига через env напрямую (CJS fallback)
  return {
    config: {
      telegram: {
        token:       process.env.TELEGRAM_BOT_TOKEN,
        adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
      }
    }
  };
})();

const axios = require('axios');

async function notifyTelegram(html) {
  const { token, adminChatId } = config.telegram;
  if (!token || !adminChatId) return;
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id:    adminChatId,
      text:       html,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('[telegram] notify error:', err.message);
  }
}

module.exports = { notifyTelegram };
