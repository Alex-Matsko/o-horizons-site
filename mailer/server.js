// Disable TLS certificate verification globally (handles expired/self-signed certs)
if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
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

app.post('/api/send', async (req, res) => {
  const { name, company, contact, message, lang } = req.body;

  // Basic validation
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
