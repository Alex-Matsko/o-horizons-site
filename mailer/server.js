if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));

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

// ── Chat sessions: lightweight step tracker (no history needed here anymore) ──
const sessions = new Map();
// session: { id, step, name, contact }

// ── Bot replies ────────────────────────────────────────────────────────────────
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
  { words: ['1с', '1c', 'mssql', 'базы', 'сервер', 'бэкап', 'backup', 'виртуал', 'vmware', 'proxmox'],
    key: null, reply: 'Мы специализируемся именно на этом! Серверы 1С, MSSQL, Veeam, VMware/Proxmox — наш профиль. Хотите обсудить вашу инфраструктуру с инженером? Напишите ваше имя.' },
  { words: ['безопасност', 'vpn', 'mikrotik', 'firewall', 'ngfw'],
    key: null, reply: 'Настройка сетевого периметра, VPN, MikroTik и NGFW — входит в наши услуги. Хотите обсудить детали? Напишите ваше имя и мы свяжемся.' },
];

function getBotReply(session, text) {
  const lower = text.toLowerCase();

  if (session.step === 'await_name') {
    session.name = text;
    session.step = 'await_contact';
    return 'Приятно познакомиться, ' + text + '! Оставьте email или Telegram — мы свяжемся в течение одного рабочего дня.';
  }

  if (session.step === 'await_contact') {
    session.contact = text;
    session.step = 'done';
    return '✅ Заявка принята! Наш инженер свяжется с вами в ближайшее время. Если срочно — пишите напрямую: info@o-horizons.com или @ohorizons в Telegram.';
  }

  const exact = BOT_REPLIES[lower];
  if (exact) {
    if (lower === 'заказать аудит') session.step = 'await_name';
    return exact.join('\n\n');
  }

  for (const kw of KEYWORDS) {
    if (kw.words.some(w => lower.includes(w))) {
      if (kw.reply) { session.step = 'await_name'; return kw.reply; }
      if (kw.key) {
        if (kw.key === 'заказать аудит') session.step = 'await_name';
        return BOT_REPLIES[kw.key].join('\n\n');
      }
    }
  }

  if (/^(привет|здравствуй|добрый|hello|hi\b)/.test(lower)) {
    return 'Добрый день! Чем могу помочь? Могу рассказать о тарифах, аудите или ответить на вопрос об инфраструктуре.';
  }

  session.step = 'await_name';
  return 'Хороший вопрос! Для подробного ответа лучше подключить нашего инженера. Напишите ваше имя — и мы свяжемся с вами.';
}

// ── Format history for 1C message ──────────────────────────────────────────────
function formatHistory(hist) {
  if (!Array.isArray(hist) || hist.length === 0) return '(переписка пуста)';
  return hist.map(m => {
    const who = m.role === 'user' ? '👤 Посетитель' : '🤖 Бот';
    return who + ': ' + String(m.text || '').slice(0, 500);
  }).join('\n');
}

// ── Send lead + full history to 1C:Dialog ─────────────────────────────────
async function sendLeadTo1C(session, history) {
  const leadId = 'chat-' + session.id + '-' + Date.now();
  const lines = [
    '━━━ КОНТАКТ ━━━',
    '👤 Имя:     ' + (session.name    || '—'),
    '✉️  Контакт: ' + (session.contact || '—'),
    '',
    '━━━ ИСТОРИЯ ПЕРЕПИСКИ ━━━',
    formatHistory(history),
  ];
  try {
    const conv = await post1C({
      createConversation: {
        extConversationId: leadId,
        title: 'Чат с сайта: ' + (session.name || 'Гость'),
      }
    });
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
  const { sessionId, text, history } = req.body || {};
  if (!sessionId || !text || typeof text !== 'string') {
    return res.status(400).json({ error: 'sessionId and text required' });
  }
  if (text.length > 1000) return res.status(400).json({ error: 'message too long' });

  // Validate history array (frontend sends it, we trust but sanitise)
  const safeHistory = Array.isArray(history)
    ? history.slice(-60).filter(m => m && typeof m.role === 'string' && typeof m.text === 'string')
    : [];

  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { id: sessionId, step: null, name: null, contact: null });
  }
  const session = sessions.get(sessionId);

  const trimmed = text.trim();
  const reply = getBotReply(session, trimmed);

  // If contact was just collected — fire 1C with the FULL history from frontend
  if (session.step === 'done' && session.contact === trimmed) {
    // safeHistory already includes the current user message (sent by frontend before this req)
    sendLeadTo1C(session, safeHistory).catch(console.error);
  }

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

// ── /api/send (email) ───────────────────────────────────────────────────────────
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
