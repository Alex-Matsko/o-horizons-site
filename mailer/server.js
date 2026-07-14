if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const fs         = require('fs');
const path       = require('path');
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://o-horizons.com';
app.use(cors({ origin: allowedOrigin }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false });
app.use('/api/send',       limiter);
app.use('/api/webhook-1c', limiter);
app.use('/api/chat',       rateLimit({ windowMs: 60*1000, max: 60 }));
app.use('/api/chat-lead',  rateLimit({ windowMs: 60*1000, max: 30 }));
app.use('/api/chat-poll',  rateLimit({ windowMs: 60*1000, max: 120 }));
app.use('/api/1c-events',  rateLimit({ windowMs: 60*1000, max: 300 }));
app.use('/api/telegram-webhook', rateLimit({ windowMs: 60*1000, max: 300 }));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

/* ══════════════════════════════════════════════════════
   1C helpers
══════════════════════════════════════════════════════ */
const WEBHOOK_1C = process.env.WEBHOOK_1C ||
  'https://integrations.1cdialog.com/integration/webhook/151566:fw0l34MTcGzGfvByMLq7tL2EIhJfQVjP/callback';

async function post1C(payload) {
  const r = await fetch(WEBHOOK_1C, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await r.text();
  console.log('1C ←', JSON.stringify(payload).slice(0, 140), '→', r.status, txt);
  return { status: r.status, text: txt };
}
function ok1C(s) { return s === 200 || s === 201 || s === 409; }

/* ══════════════════════════════════════════════════════
   Session store
   session: { id, msgSeq, operatorMode, inboxQueue: [{id,text,ts}] }
══════════════════════════════════════════════════════ */
const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, { id, msgSeq: 0, operatorMode: false, inboxQueue: [] });
  return sessions.get(id);
}

/*
  convId → sessionId: extConversationId у нас всегда 'chat-<sessionId>'
  Разбираем обратно: sessionId = convId.slice(5)
*/
function convIdToSessionId(extConversationId) {
  if (!extConversationId) return null;
  if (extConversationId.startsWith('chat-')) return extConversationId.slice(5);
  return null;
}

/* ══════════════════════════════════════════════════════
   1C conversation helpers
══════════════════════════════════════════════════════ */
async function ensureConversation(sessionId, name) {
  const convId = 'chat-' + sessionId;
  const r = await post1C({ createConversation: { extConversationId: convId, title: 'Чат с сайта: ' + (name || 'Гость') } });
  if (!ok1C(r.status)) throw new Error('createConversation failed: ' + r.status);
  return convId;
}

/* ══════════════════════════════════════════════════════
   Telegram integration — one forum topic per client
   ─────────────────────────────────────────────────────
   Требует супергруппу с включёнными "Темами" (Topics) и
   бота, добавленного туда админом с правом "Manage Topics"
   (и с отключённым privacy mode через @BotFather /setprivacy,
   иначе бот не увидит ответы менеджера внутри темы).

   api.telegram.org заблокирован для исходящих запросов из РФ —
   исходящие вызовы (createForumTopic/sendMessage) идут через
   TELEGRAM_PROXY_URL, если он задан (http(s)-прокси, вида
   http://user:pass@host:port). Входящий вебхук от Telegram
   в проксировании не нуждается — соединение инициирует сам
   Telegram, а не наш сервер.
══════════════════════════════════════════════════════ */
const { ProxyAgent } = require('undici');

const TELEGRAM_BOT_TOKEN     = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID       = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_API           = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const telegramEnabled        = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
const telegramDispatcher     = process.env.TELEGRAM_PROXY_URL
  ? new ProxyAgent(process.env.TELEGRAM_PROXY_URL)
  : undefined;

const THREADS_FILE = path.join(__dirname, 'data', 'telegram-threads.json');

function loadTelegramThreads() {
  try {
    return JSON.parse(fs.readFileSync(THREADS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveTelegramThreads(map) {
  try {
    fs.mkdirSync(path.dirname(THREADS_FILE), { recursive: true });
    fs.writeFileSync(THREADS_FILE, JSON.stringify(map));
  } catch (e) {
    console.error('saveTelegramThreads:', e.message);
  }
}

// sessionId -> message_thread_id, persisted to disk so a mailer restart
// doesn't fragment an in-progress client conversation into a new topic.
const telegramThreadsBySession = loadTelegramThreads();
const sessionIdByThread = new Map(
  Object.entries(telegramThreadsBySession).map(([sid, tid]) => [tid, sid])
);

async function tg(method, params) {
  const r = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    ...(telegramDispatcher ? { dispatcher: telegramDispatcher } : {}),
  });
  const data = await r.json();
  if (!data.ok) console.error('Telegram', method, 'failed:', data.description);
  return data;
}

async function ensureTelegramTopic(sessionId, name, phone) {
  if (!telegramEnabled) return null;
  if (telegramThreadsBySession[sessionId]) return telegramThreadsBySession[sessionId];

  const topicName = `${name || 'Гость'} · ${phone || '—'}`.slice(0, 128);
  const res = await tg('createForumTopic', { chat_id: TELEGRAM_CHAT_ID, name: topicName });
  if (!res.ok) return null;

  const threadId = res.result.message_thread_id;
  telegramThreadsBySession[sessionId] = threadId;
  sessionIdByThread.set(threadId, sessionId);
  saveTelegramThreads(telegramThreadsBySession);

  await tg('sendMessage', {
    chat_id: TELEGRAM_CHAT_ID,
    message_thread_id: threadId,
    text: `👤 ${name || '—'}\n📞 ${phone || '—'}\n🌐 Новый чат с сайта`,
  });

  return threadId;
}

async function sendTelegramText(sessionId, name, phone, text) {
  if (!telegramEnabled || !text) return;
  const threadId = await ensureTelegramTopic(sessionId, name, phone);
  if (!threadId) return;
  await tg('sendMessage', { chat_id: TELEGRAM_CHAT_ID, message_thread_id: threadId, text });
}

async function appendToChatLead({ sessionId, name, phone, history, event }) {
  const session = getSession(sessionId);

  try {
    const convId = await ensureConversation(sessionId, name);

    if (event === 'chat_started') {
      const body = ['━━━ НОВЫЙ ЧАТ ━━━', '👤 ' + (name || '—'), '📞 ' + (phone || '—')].join('\n');
      await post1C({ createMessage: { extId: convId + '-0', extConversationId: convId, text: body } });
      session.msgSeq = 0;
    } else if (event === 'operator_requested') {
      await post1C({ createMessage: {
        extId: convId + '-op-' + Date.now(),
        extConversationId: convId,
        text: '🔔 Пользователь запросил оператора',
      }});
    } else if (Array.isArray(history) && history.length) {
      const last = history[history.length - 1];
      if (last && last.text) {
        session.msgSeq += 1;
        const prefix = last.role === 'user' ? '👤 ' : '🤖 ';
        await post1C({ createMessage: {
          extId: convId + '-' + session.msgSeq,
          extConversationId: convId,
          text: prefix + last.text,
        }});
      }
    }
  } catch (e) {
    console.error('appendToChatLead (1C):', e.message);
  }

  try {
    if (event === 'chat_started') {
      await ensureTelegramTopic(sessionId, name, phone);
    } else if (event === 'operator_requested') {
      await sendTelegramText(sessionId, name, phone, '🔔 Пользователь запросил оператора');
    } else if (Array.isArray(history) && history.length) {
      const last = history[history.length - 1];
      if (last && last.text) {
        const prefix = last.role === 'user' ? '👤 ' : '🤖 ';
        await sendTelegramText(sessionId, name, phone, prefix + last.text);
      }
    }
  } catch (e) {
    console.error('appendToChatLead (Telegram):', e.message);
  }
}

/* ══════════════════════════════════════════════════════
   Bot logic
══════════════════════════════════════════════════════ */
const BOT_REPLIES = {
  'узнать о тарифах': 'У нас 4 тарифа:\n\n• Офис Base — от 25 000 ₽/мес (до 10 ПК, сеть, почта)\n• Infra Standard — от 45 000 ₽/мес (серверы 1С, MSSQL, бэкапы)\n• Infra Premium — от 70 000 ₽/мес (SLA, 24/7)\n• Virtual CIO — от 120 000 ₽/мес (IT-директор на аутсорсе)\n\nТочную стоимость — на калькуляторе: https://o-horizons.com/calculator',
  'заказать аудит':   'Отлично! Комплексный аудит — от 25 000 ₽. Проверяем бэкапы, серверы, 1С, удалённый доступ. Стоимость зачтётся в первый месяц сопровождения.',
  'задать вопрос':    null,
};

const OPERATOR_WORDS = ['оператор','инженер','человек','менеджер','специалист','живой','поддержк','связат','соедин','подключи'];

const KEYWORDS = [
  { words: ['цен','тариф','стоит','сколько','прайс'], key: 'узнать о тарифах' },
  { words: ['аудит','проверк','провери'],              key: 'заказать аудит'   },
  { words: ['1с','1c','mssql','базы','сервер','бэкап','backup','виртуал','vmware','proxmox','инфраструктур','компьютер','рабочи'],
    reply: 'Мы специализируемся именно на этом! Обслуживаем серверы 1С, MSSQL, Veeam, VMware/Proxmox и рабочие места. Расскажите подробнее — подберём тариф.' },
  { words: ['безопасност','vpn','mikrotik','firewall','ngfw'],
    reply: 'Настройка VPN, MikroTik и NGFW — наш профиль. Хотите узнать стоимость или заказать аудит?' },
  { words: ['24/7','24х7','круглосуточ','постоянн'],
    reply: 'Тариф Infra Premium и Virtual CIO включают поддержку 24/7 с гарантированным SLA. Рассказать подробнее?' },
];

function getBotReply(session, text) {
  const lower = text.toLowerCase();

  if (OPERATOR_WORDS.some(w => lower.includes(w))) {
    session.operatorMode = true;
    return {
      reply: '🔔 Понял, соединяю с инженером! Обычно отвечаем в течение нескольких минут. Напишите здесь — оператор увидит сообщение.',
      operatorMode: true,
    };
  }

  if (/^(привет|здравствуй|добрый|hello|hi\b|хай|ку\b)/.test(lower))
    return { reply: 'Добрый день! Чем могу помочь? Расскажу о тарифах, аудите — или сразу соединю с инженером.' };

  if (lower === 'задать вопрос')
    return { reply: 'Конечно! Напишите ваш вопрос — отвечу или подключу инженера.' };
  const exact = BOT_REPLIES[lower];
  if (exact) return { reply: exact };

  for (const kw of KEYWORDS) {
    if (kw.words.some(w => lower.includes(w))) {
      if (kw.reply) return { reply: kw.reply };
      if (kw.key)   return { reply: BOT_REPLIES[kw.key] };
    }
  }

  if (text.trim().length > 60) {
    session.operatorMode = true;
    return {
      reply: '📨 Передал ваш вопрос инженеру. Он ответит здесь в чате. Обычно ждать не дольше нескольких минут.',
      operatorMode: true,
    };
  }

  return { reply: 'Уточните, пожалуйста: вас интересуют тарифы, аудит IT-инфраструктуры — или хотите сразу поговорить с инженером?' };
}

/* ══════════════════════════════════════════════════════
   POST /api/chat
══════════════════════════════════════════════════════ */
app.post('/api/chat', async (req, res) => {
  const { sessionId, text } = req.body || {};
  if (!sessionId || !text || typeof text !== 'string')
    return res.status(400).json({ error: 'sessionId and text required' });
  if (text.length > 1000)
    return res.status(400).json({ error: 'message too long' });

  const session = getSession(sessionId);
  if (session.operatorMode)
    return res.json({ reply: null, operatorMode: true });

  const result = getBotReply(session, text.trim());
  return res.json(result);
});

/* ══════════════════════════════════════════════════════
   POST /api/chat-lead
══════════════════════════════════════════════════════ */
app.post('/api/chat-lead', async (req, res) => {
  const { sessionId, name, phone, history, event } = req.body || {};
  if (!sessionId || !name || !phone)
    return res.status(400).json({ error: 'sessionId, name and phone are required' });
  if (String(name).length > 100 || String(phone).length > 30)
    return res.status(400).json({ error: 'fields too long' });

  const safeHistory = Array.isArray(history)
    ? history.slice(-60).filter(m => m && typeof m.role === 'string' && typeof m.text === 'string')
    : [];

  if (event === 'operator_requested') {
    const session = getSession(sessionId);
    session.operatorMode = true;
  }

  appendToChatLead({ sessionId, name, phone, history: safeHistory, event: event || 'message' })
    .catch(console.error);

  return res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════
   POST /api/1c-events
   ─────────────────────────────────────────────────────
   Этот URL нужно зарегистрировать как "Callback URL"
   в настройках вебхук-интеграции 1С:Диалог.

   1С:Диалог шлёт сюда POST-запросы когда оператор
   пишет ответ в чат. Формат тела (JSON):
   {
     "receiveMessage": {
       "extConversationId": "chat-<sessionId>",
       "text": "Текст ответа",
       "extUserId": "operator_id"
     }
   }
   Сервер кладёт текст в inboxQueue нужной сессии.
   Фронтенд забирает его через GET /api/chat-poll.
══════════════════════════════════════════════════════ */
app.post('/api/1c-events', (req, res) => {
  const body = req.body || {};
  console.log('1c-events ←', JSON.stringify(body).slice(0, 300));

  // ── receiveMessage: оператор написал в беседу ──
  if (body.receiveMessage) {
    const { extConversationId, text, extUserId } = body.receiveMessage;
    const sessionId = convIdToSessionId(extConversationId);

    if (sessionId && text) {
      const session = getSession(sessionId);
      // Не пушим назад сообщения самого бота/сайта (они имеют extUserId начинающийся с 'chat-')
      const isBotMessage = extUserId && String(extUserId).startsWith('chat-');
      if (!isBotMessage) {
        session.operatorMode = true;
        session.inboxQueue.push({
          id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          text: String(text).slice(0, 2000),
          ts: Date.now(),
        });
        if (session.inboxQueue.length > 50) session.inboxQueue = session.inboxQueue.slice(-50);
        console.log('operator → session', sessionId, ':', String(text).slice(0, 80));
      }
    }
    return res.status(200).json({ ok: true });
  }

  // ── Любые другие события (createConversation ACK и др.) — просто 200 ──
  return res.status(200).json({ ok: true });
});

/* ══════════════════════════════════════════════════════
   POST /api/telegram-webhook
   ─────────────────────────────────────────────────────
   Регистрируется как webhook бота:
   https://api.telegram.org/bot<TOKEN>/setWebhook
     ?url=https://o-horizons.com/api/telegram-webhook
     &secret_token=<TELEGRAM_WEBHOOK_SECRET>

   Менеджер отвечает прямо в теме (topic) клиента в группе —
   находим sessionId по message_thread_id и кладём текст в
   inboxQueue, откуда его заберёт GET /api/chat-poll.
══════════════════════════════════════════════════════ */
app.post('/api/telegram-webhook', (req, res) => {
  if (TELEGRAM_WEBHOOK_SECRET) {
    const provided = req.get('X-Telegram-Bot-Api-Secret-Token');
    if (provided !== TELEGRAM_WEBHOOK_SECRET) return res.sendStatus(401);
  }

  res.sendStatus(200); // ack сразу — Telegram ждёт быстрый ответ

  const message = (req.body || {}).message;
  if (!message || !message.text || message.from?.is_bot) return;
  if (String(message.chat?.id) !== String(TELEGRAM_CHAT_ID)) return;

  const threadId = message.message_thread_id;
  if (!threadId) return; // сообщение вне какой-либо темы — игнорируем

  const sessionId = sessionIdByThread.get(threadId);
  if (!sessionId) return;

  const session = getSession(sessionId);
  session.operatorMode = true;
  session.inboxQueue.push({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    text: message.text.slice(0, 2000),
    ts: Date.now(),
  });
  if (session.inboxQueue.length > 50) session.inboxQueue = session.inboxQueue.slice(-50);
  console.log('telegram operator → session', sessionId, ':', message.text.slice(0, 80));
});

/* ══════════════════════════════════════════════════════
   GET /api/chat-poll?sessionId=XXX&after=TIMESTAMP
══════════════════════════════════════════════════════ */
app.get('/api/chat-poll', (req, res) => {
  const { sessionId, after } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const session = sessions.get(sessionId);
  if (!session) return res.json({ messages: [], operatorMode: false });

  const afterTs = parseInt(after || '0', 10);
  const messages = session.inboxQueue.filter(m => m.ts > afterTs);

  return res.json({ messages, operatorMode: session.operatorMode });
});

/* ══════════════════════════════════════════════════════
   POST /api/webhook-1c  — contact form
══════════════════════════════════════════════════════ */
app.post('/api/webhook-1c', async (req, res) => {
  const { name, company, phone, contact, message } = req.body || {};
  if (!name || !contact) return res.status(400).json({ error: 'name and contact are required' });
  const leadId = 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const lines = ['👤 Имя: ' + name];
  if (company) lines.push('🏢 Компания: ' + company);
  if (phone)   lines.push('📞 Телефон: ' + phone);
  lines.push('✉️ Контакт: ' + contact);
  if (message) lines.push('💬 Сообщение: ' + message);
  try {
    const c = await post1C({ createConversation: { extConversationId: leadId, title: 'Новое обращение: ' + name } });
    if (!ok1C(c.status)) return res.status(502).json({ error: 'createConversation failed' });
    const m = await post1C({ createMessage: { extId: leadId + '-msg', extConversationId: leadId, text: lines.join('\n') } });
    if (!ok1C(m.status)) return res.status(502).json({ error: 'createMessage failed' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('webhook-1c:', err.message);
    return res.status(502).json({ error: 'Failed to reach 1C:Dialog' });
  }
});

/* ══════════════════════════════════════════════════════
   POST /api/send  — email
══════════════════════════════════════════════════════ */
app.post('/api/send', async (req, res) => {
  const { name, company, phone, contact, message, lang } = req.body;
  if (!name || !contact) return res.status(400).json({ error: 'name and contact are required' });
  if (typeof name !== 'string' || typeof contact !== 'string') return res.status(400).json({ error: 'invalid fields' });
  if (name.length > 100 || contact.length > 200 || (message && message.length > 2000)) return res.status(400).json({ error: 'fields too long' });
  const isRu = lang !== 'en';
  const subject = isRu ? `Новая заявка на аудит от ${name}` : `New audit request from ${name}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
  <h2 style="color:#01696f">${isRu ? 'Новая заявка на аудит' : 'New Audit Request'}</h2>
  <table style="width:100%;font-size:14px">
    <tr><td style="color:#888;width:130px;padding:6px 0">${isRu?'Имя':'Name'}</td><td><strong>${name}</strong></td></tr>
    ${company?`<tr><td style="color:#888;padding:6px 0">${isRu?'Компания':'Company'}</td><td>${company}</td></tr>`:''}
    ${phone?`<tr><td style="color:#888;padding:6px 0">${isRu?'Телефон':'Phone'}</td><td><strong>${phone}</strong></td></tr>`:''}
    <tr><td style="color:#888;padding:6px 0">${isRu?'Контакт':'Contact'}</td><td><strong>${contact}</strong></td></tr>
    ${message?`<tr><td style="color:#888;padding:6px 0;vertical-align:top">${isRu?'Сообщение':'Message'}</td><td>${message.replace(/\n/g,'<br/>')}</td></tr>`:''}
  </table>
  <p style="color:#aaa;font-size:12px">o-horizons.com</p>
</div>`;
  try {
    await transporter.sendMail({ from: `"Открытые Горизонты" <${process.env.SMTP_USER}>`, to: process.env.MAIL_TO, subject, html });
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mailer listening on :${PORT}`));
