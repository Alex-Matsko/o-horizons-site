import axios from 'axios';
import { config } from '../config/index.js';

export async function sendTelegramAlert(message) {
  if (!config.telegram.token || !config.telegram.adminChatId) return;
  try {
    await axios.post(
      `https://api.telegram.org/bot${config.telegram.token}/sendMessage`,
      {
        chat_id: config.telegram.adminChatId,
        text: message,
        parse_mode: 'HTML',
      },
      { timeout: 5000 }
    );
  } catch (err) {
    console.error('[Telegram] Failed to send alert:', err.message);
  }
}
