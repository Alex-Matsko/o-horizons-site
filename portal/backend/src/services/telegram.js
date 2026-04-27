'use strict';

const axios  = require('axios');
const { config } = require('../config/index.js');

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
