if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

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
app.use('/api/chat',       rateLimit({ windowMs: 60*1000, max: 30 }));
app.use('/api/chat-lead',  rateLimit({ windowMs: 60*1000, max: 10 }));

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

function ok1C(status) {
  return status === 200 || status === 201 || status === 409;
}

function formatHistory(hist) {
  if (!Array.isArray(hist) || !hist.length) return '(переписка пуста)';
  return hist
    .filter(m => m && m.role && m.text)
    .map(m => (m.role === 'user' ? '👤 Посетитель' : '🤖 Бот') + ': ' + String(m.text).slice(0, 600))
    .join('\n');
}

async function sendLeadTo1C({ name, phone, sessionId, history }) {
  const leadId = 'chat-' + sessionId + '-' + Date.now();
  const title  = 'Чат с сайта: ' + (name || 'Гость');

  const body = [
    '━━━ КОНТАКТ ━━━',
    '👤 Имя:     ' + (name  || '—'),
    '📞 Телефон: ' + (phone || '—'),
    '',
    '━━━ ИСТОРИЯ ПЕРЕПИСКИ ━━━',
    formatHistory(history),
  ].join('\n');

  try {
    const c = await post1C({ createConversation: { extConversationId: leadId, title } });
    if (!ok1C(c.status)) { console.error('createConversation failed:', c.status, c.text); return; }
    await post1C({ createMessage: { extId: leadId + '-lead', extConversationId: leadId, text: body } });
  } catch (e) {
    console.error('sendLeadTo1C:', e.message);
  }
}

/* ══════════════════════════════════════════════════════
   Session store (step tracker; history comes from frontend)
══════════════════════════════════════════════════════ */
const sessions = new Map();
function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, { id, step: null });
  return sessions.get(id);
}

/* ══════════════════════════════════════════════════════
   Bot logic
══════════════════════════════════════════════════════ */
const BOT_REPLIES = {
  'узнать о тарифах': [
    'У нас 4 тарифа:\n\n• Офис Base — от 25 000 ₽/мес (до 10 ПК, сеть, почта)\n• Infra Standard — от 45 000 ₽/мес (серверы 1С, MSSQL, бэкапы)\n• Infra Premium — от 70 000 ₽/мес (SLA, 24/7)\n• Virtual CIO — от 120 000 ₽/мес (IT-директор на аутсорсе)',
    'Точную стоимость — на калькуляторе: https://o-horizons.com/calculator',
  ],
  'заказать аудит': [
    'Отлично! Комплексный аудит — от 25 000 ₽. Проверяем бэкапы, серверы, 1С, удалённый доступ. Стоимость зачтётся в первый месяц сопровождения.',
  ],
  'задать вопрос': [
    'Конечно! Задавайте — постараюсь ответить. Если вопрос сложный, подключу инженера.',
  ],
};

const KEYWORDS = [
  { words: ['цен','тариф','стоит','сколько','прайс'], key: 'узнать о тарифах' },
  { words: ['аудит','проверк','провери'],              key: 'заказать аудит'   },
  { words: ['1с','1c','mssql','базы','сервер','бэкап','backup','виртуал','vmware','proxmox'],
    reply: 'Мы специализируемся именно на этом! Серверы 1С, MSSQL, Veeam, VMware/Proxmox — наш профиль.' },
  { words: ['безопасност','vpn','mikrotik','firewall','ngfw'],
    reply: 'Настройка VPN, MikroTik и NGFW входит в наши услуги.' },
];

// Returns { reply, showForm }
function getBotReply(session, text) {
  const lower = text.toLowerCase();

  // greetings
  if (/^(привет|здравствуй|добрый|hello|hi\b)/.test(lower))
    return { reply: 'Добрый день! Чем могу помочь? Расскажу о тарифах, аудите или отвечу на вопрос.' };

  // exact quick-button matches
  const exact = BOT_REPLIES[lower];
  if (exact) {
    const showForm = lower === 'заказать аудит';
    return { reply: exact.join('\n\n'), showForm };
  }

  // keyword matching
  for (const kw of KEYWORDS) {
    if (kw.words && kw.words.some(w => lower.includes(w))) {
      if (kw.reply) return { reply: kw.reply + ' Оставьте контакт — инженер перезвонит.', showForm: true };
      if (kw.key) {
        const showForm = kw.key === 'заказать аудит';
        return { reply: BOT_REPLIES[kw.key].join('\n\n'), showForm };
      }
    }
  }

  // fallback — always offer form
  return {
    reply: 'Хороший вопрос! Для точного ответа лучше подключить нашего инженера — оставьте контакт и мы перезвоним.',
    showForm: true,
  };
}

/* ══════════════════════════════════════════════════════
   POST /api/chat  — regular bot messages
══════════════════════════════════════════════════════ */
app.post('/api/chat', async (req, res) => {
  const { sessionId, text } = req.body || {};
  if (!sessionId || !text || typeof text !== 'string')
    return res.status(400).json({ error: 'sessionId and text required' });
  if (text.length > 1000)
    return res.status(400).json({ error: 'message too long' });

  const session = getSession(sessionId);
  const { reply, showForm = false } = getBotReply(session, text.trim());

  // If form should be shown — set step so we don't show it again
  if (showForm) session.step = 'form_shown';

  return res.json({ reply, showForm: showForm && session.step === 'form_shown' });
});

/* ══════════════════════════════════════════════════════
   POST /api/chat-lead  — lead form submission with FULL history
══════════════════════════════════════════════════════ */
app.post('/api/chat-lead', async (req, res) => {
  const { sessionId, name, phone, history } = req.body || {};

  if (!sessionId || !name || !phone)
    return res.status(400).json({ error: 'sessionId, name and phone are required' });
  if (String(name).length > 100 || String(phone).length > 30)
    return res.status(400).json({ error: 'fields too long' });

  const safeHistory = Array.isArray(history)
    ? history.slice(-60).filter(m => m && typeof m.role === 'string' && typeof m.text === 'string')
    : [];

  // Fire 1C (don't block response)
  sendLeadTo1C({ name, phone, sessionId, history: safeHistory }).catch(console.error);

  return res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════
   POST /api/webhook-1c  — contact form (not chat)
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
