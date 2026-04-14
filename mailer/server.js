if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));

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
  'https://integrations.1cdialog.com/integration/webhook/909421:qMzZjLbwBCSjAJBq7aQ76F5RyZ5orTG4/callback';

async function post1C(payload) {
  const res = await fetch(WEBHOOK_1C, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log('1C:Dialog', JSON.stringify(payload).slice(0, 80), '→', res.status, text);
  return { status: res.status, text };
}

// ── 1C:Dialog webhook proxy ──────────────────────────────────────────────────
app.post('/api/webhook-1c', async (req, res) => {
  const { name, company, phone, contact, message } = req.body || {};

  if (!name || !contact) {
    return res.status(400).json({ error: 'name and contact are required' });
  }

  const leadId = 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  const lines = [
    '👤 Имя: ' + name,
  ];
  if (company) lines.push('🏢 Компания: ' + company);
  if (phone)   lines.push('📞 Телефон: ' + phone);
  lines.push('✉️ Контакт: ' + contact);
  if (message) lines.push('💬 Сообщение: ' + message);

  try {
    // Step 1: create conversation
    const conv = await post1C({
      createConversation: {
        extConversationId: leadId,
        title: 'Новое обращение с сайта: ' + name + (company ? ' (' + company + ')' : ''),
      }
    });

    // 409 = conversation already exists, that's fine
    if (!conv.status.toString().startsWith('2') && conv.status !== 409) {
      return res.status(502).json({ error: 'createConversation failed', status: conv.status, body: conv.text });
    }

    // Step 2: send message into that conversation
    const msg = await post1C({
      createMessage: {
        extId:             leadId + '-msg',
        extConversationId: leadId,
        text:              lines.join('\n'),
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
// ────────────────────────────────────────────────────────────────────────────

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
