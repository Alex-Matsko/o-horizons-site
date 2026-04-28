const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const PORTAL_URL = process.env.PORTAL_URL || 'https://1c.o-horizons.com';
const FROM = `"1С Портал O-Horizons" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

const base = (title, body) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Inter,sans-serif;background:#0d0f14;color:#e2e8f0;margin:0;padding:32px}
.card{background:#151820;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:32px;max-width:520px;margin:0 auto}
.logo{font-size:1rem;font-weight:700;color:#e2e8f0;margin-bottom:24px}  
.logo span{color:#3b82f6}.accent{color:#3b82f6}.btn{display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;margin:20px 0}
.footer{font-size:0.75rem;color:#475569;margin-top:24px;text-align:center}
</style></head><body><div class="card">
<div class="logo">◈ Открытые Горизонты / <span>1С Портал</span></div>
<h2 style="color:#f1f5f9;margin-bottom:12px">${title}</h2>
${body}
<div class="footer">O-Horizons · <a href="${PORTAL_URL}" style="color:#3b82f6">${PORTAL_URL}</a></div>
</div></body></html>`;

exports.sendVerify = (email, token) => transport.sendMail({
  from: FROM, to: email,
  subject: 'Подтвердите email — 1С Портал O-Horizons',
  html: base('Подтверждение email', `
    <p>Для активации аккаунта перейдите по ссылке:</p>
    <a class="btn" href="${PORTAL_URL}/verify?token=${token}">Подтвердить email</a>
    <p style="color:#64748b">Ссылка действительна 24 часа.</p>`),
});

exports.sendPasswordReset = (email, token) => transport.sendMail({
  from: FROM, to: email,
  subject: 'Сброс пароля — 1С Портал O-Horizons',
  html: base('Сброс пароля', `
    <p>Получен запрос на сброс пароля для вашего аккаунта.</p>
    <a class="btn" href="${PORTAL_URL}/reset-password?token=${token}">Сбросить пароль</a>
    <p style="color:#64748b">Если вы не запрашивали сброс — проигнорируйте письмо.</p>`),
});

exports.sendDbRequestReceived = (email, dbName) => transport.sendMail({
  from: FROM, to: email,
  subject: `Заявка на базу «${dbName}» принята`,
  html: base('Заявка принята ✓', `
    <p>Ваша заявка на создание базы <strong class="accent">${dbName}</strong> получена и передана администратору.</p>
    <p>Обычно развёртывание занимает <strong>2–4 рабочих часа</strong>. Мы уведомим вас по email когда база будет готова.</p>
    <a class="btn" href="${PORTAL_URL}/dashboard">Перейти в портал</a>`),
});

exports.sendDbReady = (email, dbName, url) => transport.sendMail({
  from: FROM, to: email,
  subject: `База «${dbName}» готова к работе`,
  html: base('База данных готова 🎉', `
    <p>Ваша база <strong class="accent">${dbName}</strong> успешно создана и доступна по ссылке:</p>
    <a class="btn" href="${url}">Открыть в браузере</a>
    <p style="color:#64748b">Для входа используйте учётные данные, которые вы задали при заказе.</p>`),
});

exports.sendDbRequestAdmin = (adminEmail, req, tenant) => transport.sendMail({
  from: FROM, to: adminEmail,
  subject: `[ПОРТАЛ] Новая заявка на базу от ${tenant.email}`,
  html: base('Новая заявка на базу', `
    <p><strong>Клиент:</strong> ${tenant.company_name || tenant.email}</p>
    <p><strong>Конфигурация:</strong> ${req.configuration}</p>
    <p><strong>Название:</strong> ${req.db_name_requested}</p>
    <p><strong>Платформа:</strong> ${req.platform_version}</p>
    <p><strong>Комментарий:</strong> ${req.comment || '—'}</p>
    <a class="btn" href="${PORTAL_URL}/admin/requests">Открыть в админ-панели</a>`),
});

exports.sendBackupReady = (email, dbName, sizeMb) => transport.sendMail({
  from: FROM, to: email,
  subject: `Резервная копия «${dbName}» создана`,
  html: base('Бэкап готов ✓', `
    <p>Резервная копия базы <strong class="accent">${dbName}</strong> успешно создана.</p>
    <p><strong>Размер:</strong> ${(sizeMb / 1024).toFixed(2)} ГБ</p>
    <a class="btn" href="${PORTAL_URL}/backups">Управление бэкапами</a>`),
});
