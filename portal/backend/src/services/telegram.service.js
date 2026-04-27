import { logger } from '../utils/logger.js';

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID    = process.env.TELEGRAM_ADMIN_CHAT_ID;

export async function sendTelegram(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    logger.warn('Telegram not configured, skipping notification');
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) logger.warn('Telegram send failed:', await res.text());
  } catch (err) {
    logger.error('Telegram error:', err.message);
  }
}
