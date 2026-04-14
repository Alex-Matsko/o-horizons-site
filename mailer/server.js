if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://o-horizons.com';
app.use(cors({ origin: allowedOrigin }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/send', limiter);
app.use('/api/webhook-1c', limiter);
app.use('/api/chat', rateLimit({ windowMs: 60 * 1000, max: 30 }));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── helpers ───────────────────────────────────────────────────────────────────
const WEBHOOK_1C = process.env.WEBHOOK_1C ||
  'https://integrations.1cdialog.com/integration/webhook/151566:fw0l34MTcGzGfvByMLq7tL2EIhJfQVjP/callback';

async function post1C(payload) {
  const res = await fetch(WEBHOOK_1C, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log('1C:Dialog', JSON.stringify(payload).slice(0, 120), '→', res.status, text);
  return { status: res.status, text };
}

// ── Chat sessions store (in-memory, resets on restart) ────────────────────────
// session: { id, step, name, contact, history: [{role, text}] }
const sessions = new Map();

const BOT_REPLIES = {
  'узнать о тарифах': [
    'У нас есть 4 тарифа:\n\n• Офис Base — от 25 000 ₽/мес (до 10 ПК, сеть, почта)\n• Infra Standard — от 45 000 ₽/мес (серверы 1С, MSSQL, бэкапы)\n• Infra Premium — от 70 000 ₽/мес (SLA, 24/7, тесты восстановления)\n• Virtual CIO — от 120 000 ₽/мес (IT-директор на аутсорсе)',
    'Точную стоимость можно рассчитать в калькуляторе: https://o-horizons.com/calculator — или оставьте контакт, и мы подберём тариф под вашу инфраструктуру.',
  ],
  'заказать аудит': [
    'Отлично! Комплексный аудит IT-инфраструктуры — от 25 000 ₽. Проверяем бэкапы, серверы, 1С и удалённый доступ. Стоимость зачтётся в первый месяц сопровождения.',
    'Чтобы оформить заявку, напишите ваше имя — и я передам её нашему инженеру.',
  ],
  'задать вопрос': [
    'Конечно! Задавайте — постараюсь ответить. Если вопрос сложный, подключу инженера.',
  ],
};

const KEYWORDS = [
  { words: ['цен', 'тариф', 'стоит', 'сколько', 'прайс'], key: 'узнать о тарифах' },
  { words: ['аудит', 'проверк', 'провери'], key: 'заказать аудит' },
  { words: ['1с', '1c', 'mssql', 'базы', 'сервер', 'бэкап', 'backup', 'виртуал', 'vmware', 'proxmox'], key: null, reply: 'Мы специализируемся именно на этом! Серверы 1С, MSSQL, Veeam, VMware/Proxmox — наш профиль. Хотите обсудить вашу инфраструктуру с инженером? Напишите ваше имя.' },
  { words: ['безопасност', 'vpn', 'mikrotik', 'firewall', 'ngfw'], key: null, reply: 'Настройка сетевого периметра, VPN, MikroTik и NGFW — входит в наши услуги. Хотите обсудить детали? Напишите ваше имя и мы свяжемся.' },
];

function getBotReply(session, text) {
  const lower = text.toLowerCase();

  // waiting for name
  if (session.step === 'await_name') {
    session.name = text;
    session.step = 'await_contact';
    return 'Приятно познакомиться, ' + text + '! Оставьте email или Telegram — мы свяжемся в течение одного рабочего дня.';
  }

  // waiting for contact
  if (session.step === 'await_contact') {
    session.contact = text;
    session.step = 'done';
    sendLeadTo1C(session);
    return '✅ Заявка принята! Наш инженер свяжется с вами в ближайшее время. Если срочно — пишите напрямую: info@o-horizons.com или @ohorizons в Telegram.';
  }

  // exact quick buttons
  const exact = BOT_REPLIES[lower];
  if (exact) {
    if (lower === 'заказать аудит') session.step = 'await_name';
    return exact.join('\n\n');
  }

  // keyword matching
  for (const kw of KEYWORDS) {
    if (kw.words.some(w => lower.includes(w))) {
      if (kw.reply) {
        session.step = 'await_name';
        return kw.reply;
      }
      if (kw.key) {
        const replies = BOT_REPLIES[kw.key];
        if (kw.key === 'заказать аудит') session.step = 'await_name';
        return replies.join('\n\n');
      }
    }
  }

  // greetings
  if (/^(привет|здравствуй|добрый|hello|hi\b)/.test(lower)) {
    return 'Добрый день! Чем могу помочь? Могу рассказать о тарифах, аудите или ответить на вопрос об инфраструктуре.';
  }

  // fallback — offer operator
  session.step = 'await_name';
  return 'Хороший вопрос! Для подробного ответа лучше подключить нашего инженера. Напишите ваше имя — и мы свяжемся с вами.';
}

// ── Format chat history for 1C ───────────────────────────────────────────────
function formatHistory(history) {
  if (!history || history.length === 0) return '(история пуста)';
  return history.map(m => {
    const who = m.role === 'user' ? '👤 Посетитель' : '🤖 Бот';
    return who + ': ' + m.text;
  }).join('\n');
}

// ── Send full lead + chat history to 1C:Dialog ───────────────────────────────
async function sendLeadTo1C(session) {
  const leadId = 'chat-' + session.id + '-' + Date.now();
  const title = 'Чат с сайта: ' + (session.name || 'Гость');

  // Build one consolidated message: contact info + full dialog
  const lines = [
    '━━━ КОНТАКТ ━━━',
    '👤 Имя: '    + (session.name    || '—'),
    '✉️  Контакт: ' + (session.contact || '—'),
    '',
    '━━━ ИСТОРИЯ ПЕРЕПИСКИ ━━━',
    formatHistory(session.history),
  ];

  try {
    const conv = await post1C({
      createConversation: {
        extConversationId: leadId,
        title,
      }
    });
    // 2xx or 409 (already exists) are both OK
    if (!conv.status.toString().startsWith('2') && conv.status !== 409) {
      console.error('createConversation failed:', conv.status, conv.text);
      return;
    }

    await post1C({
      createMessage: {
        extId: leadId + '-lead',
        extConversationId: leadId,
        text: lines.join('\n'),
      }
    });
  } catch (e) {
    console.error('sendLeadTo1C error:', e.message);
  }
}

// ── /api/chat ─────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { sessionId, text } = req.body || {};
  if (!sessionId || !text || typeof text !== 'string') {
    return res.status(400).json({ error: 'sessionId and text required' });
  }
  if (text.length > 1000) return res.status(400).json({ error: 'message too long' });

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { id: sessionId, step: null, name: null, contact: null, history: [] });
  }
  const session = sessions.get(sessionId);

  const trimmed = text.trim();

  // Save user message to history BEFORE generating reply
  session.history.push({ role: 'user', text: trimmed });
  // Keep history bounded (last 60 messages)
  if (session.history.length > 60) session.history = session.history.slice(-60);

  const reply = getBotReply(session, trimmed);

  // Save bot reply to history
  session.history.push({ role: 'bot', text: reply });

  return res.json({ reply });
});

// ── 1C:Dialog webhook proxy (contact form) ───────────────────────────────────
app.post('/api/webhook-1c', async (req, res) => {
  const { name, company, phone, contact, message } = req.body || {};

  if (!name || !contact) {
    return res.status(400).json({ error: 'name and contact are required' });
  }

  const leadId = 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  const lines = ['👤 Имя: ' + name];
  if (company) lines.push('🏢 Компания: ' + company);
  if (phone)   lines.push('📞 Телефон: ' + phone);
  lines.push('✉️ Контакт: ' + contact);
  if (message) lines.push('💬 Сообщение: ' + message);

  try {
    const conv = await post1C({
      createConversation: {
        extConversationId: leadId,
        title: 'Новое обращение с сайта: ' + name + (company ? ' (' + company + ')' : ''),
      }
    });

    if (!conv.status.toString().startsWith('2') && conv.status !== 409) {
      return res.status(502).json({ error: 'createConversation failed', status: conv.status, body: conv.text });
    }

    const msg = await post1C({
      createMessage: {
        extId: leadId + '-msg',
        extConversationId: leadId,
        text: lines.join('\n'),
      }
    });

    if (!msg.status.toString().startsWith('2') && msg.status !== 409) {
      return res.status(502).json({ error: 'createMessage failed', status: msg.status, body: msg.text });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('1C webhook error:', err.message);
    return res.status(502).json({ error: 'Failed to reach 1C:Dialog' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/send', async (req, res) => {
  const { name, company, phone, contact, message, lang } = req.body;

  if (!name || !contact) {
    return res.status(400).json({ error: 'name and contact are required' });
  }
  if (typeof name !== 'string' || typeof contact !== 'string') {
    return res.status(400).json({ error: 'invalid fields' });
  }
  if (name.length > 100 || contact.length > 200 || (message && message.length > 2000)) {
    return res.status(400).json({ error: 'fields too long' });
  }

  const isRu = lang !== 'en';
  const subject = isRu
    ? `Новая заявка на аудит от ${name}${company ? ' (' + company + ')' : ''}`
    : `New audit request from ${name}${company ? ' (' + company + ')' : ''}`;

  const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;">
  <h2 style="color:#01696f;margin-bottom:4px;">${isRu ? 'Новая заявка на аудит' : 'New Audit Request'}</h2>
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;"/>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:6px 0;color:#888;width:130px;">${isRu ? 'Имя' : 'Name'}</td><td style="padding:6px 0;"><strong>${name}</strong></td></tr>
    ${company ? `<tr><td style="padding:6px 0;color:#888;">${isRu ? 'Компания' : 'Company'}</td><td style="padding:6px 0;">${company}</td></tr>` : ''}
    ${phone ? `<tr><td style="padding:6px 0;color:#888;">${isRu ? 'Телефон' : 'Phone'}</td><td style="padding:6px 0;"><strong>${phone}</strong></td></tr>` : ''}
    <tr><td style="padding:6px 0;color:#888;">${isRu ? 'Контакт' : 'Contact'}</td><td style="padding:6px 0;"><strong>${contact}</strong></td></tr>
    ${message ? `<tr><td style="padding:6px 0;color:#888;vertical-align:top;">${isRu ? 'Сообщение' : 'Message'}</td><td style="padding:6px 0;">${message.replace(/\n/g, '<br/>')}</td></tr>` : ''}
  </table>
  <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;"/>
  <p style="color:#aaa;font-size:12px;">o-horizons.com</p>
</div>`;

  try {
    await transporter.sendMail({
      from: `"Открытые Горизонты" <${process.env.SMTP_USER}>`,
      to:   process.env.MAIL_TO,
      subject,
      html,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mailer listening on :${PORT}`));
