// Disable TLS certificate verification globally (handles expired/self-signed certs)
if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Trust Nginx reverse proxy (fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set('trust proxy', 1);

app.use(express.json({ limit: '16kb' }));

// CORS — only allow own domain
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://o-horizons.com';
app.use(cors({ origin: allowedOrigin }));

// Rate limiting — max 10 requests per 15 min per IP
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
  tls: {
    rejectUnauthorized: false,
  },
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── 1C:Dialog webhook proxy ──────────────────────────────────────────────────
const WEBHOOK_1C = process.env.WEBHOOK_1C ||
  'https://integrations.1cdialog.com/integration/webhook/909421:qMzZjLbwBCSjAJBq7aQ76F5RyZ5orTG4/callback';

app.post('/api/webhook-1c', async (req, res) => {
  const { name, company, phone, contact, message } = req.body || {};

  if (!name || !contact) {
    return res.status(400).json({ error: 'name and contact are required' });
  }

  // Generate unique ID for this lead (timestamp + random suffix)
  const leadId = 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  // Build message text
  const lines = [];
  lines.push('📋 Новая заявка с сайта o-horizons.com');
  lines.push('');
  lines.push('👤 Имя: ' + name);
  if (company) lines.push('🏢 Компания: ' + company);
  if (phone)   lines.push('📞 Телефон: ' + phone);
  lines.push('✉️ Контакт: ' + contact);
  if (message) lines.push('💬 Сообщение: ' + message);

  // Determine channel type from contact field
  const isTelegram = contact.startsWith('@') || contact.toLowerCase().includes('t.me');
  const channelType = isTelegram ? 'telegram' : 'email';

  // 1C:Dialog payload — each lead is a new conversation
  const payload = {
    createMessage: {
      extId:             leadId,
      extConversationId: leadId,
      subject:           'Заявка с сайта: ' + name + (company ? ' (' + company + ')' : ''),
      text:              lines.join('\n'),
      textFormat:        'text/plain',
      channelType:       channelType,
      contact: {
        name:    name,
        phone:   phone   || undefined,
        email:   !isTelegram ? contact : undefined,
        telegram: isTelegram ? contact : undefined,
      },
    }
  };

  // Remove undefined keys from contact object
  Object.keys(payload.createMessage.contact).forEach(k => {
    if (payload.createMessage.contact[k] === undefined) {
      delete payload.createMessage.contact[k];
    }
  });

  try {
    console.log('Sending to 1C:Dialog:', JSON.stringify(payload, null, 2));

    const upstream = await fetch(WEBHOOK_1C, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    console.log('1C:Dialog response:', upstream.status, text);

    // 200/201 = success, 409 = already exists (treat as ok)
    if (upstream.ok || upstream.status === 409) {
      return res.json({ ok: true, status: upstream.status });
    }

    console.error('1C webhook error:', upstream.status, text);
    return res.status(502).json({ error: '1C upstream error', status: upstream.status, body: text });
  } catch (err) {
    console.error('1C webhook fetch failed:', err.message);
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
  if (phone && (typeof phone !== 'string' || phone.length > 30)) {
    return res.status(400).json({ error: 'invalid phone' });
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
      to: process.env.MAIL_TO,
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
