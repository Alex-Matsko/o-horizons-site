import axios from 'axios';
import { config } from '../config/index.js';

export async function notifyTelegram(text) {
  if (!config.telegram.token || !config.telegram.adminChatId) return;
  try {
    await axios.post(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, {
      chat_id: config.telegram.adminChatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('[Telegram] Notify failed:', err.message);
  }
}
