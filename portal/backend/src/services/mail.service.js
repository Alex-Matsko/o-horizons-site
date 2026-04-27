'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || 'noreply@o-horizons.com';
const PORTAL_URL = process.env.FRONTEND_URL || 'https://1c.o-horizons.com';

async function sendVerification(email, token) {
  const link = `${PORTAL_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Подтвердите ваш email — O-Horizons 1С Портал',
    html: `<p>Для подтверждения email перейдите по <a href="${link}">ссылке</a>.</p>`,
  });
}

async function sendPasswordReset(email, token) {
  const link = `${PORTAL_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Сброс пароля — O-Horizons 1С Портал',
    html: `<p>Ссылка для сброса пароля: <a href="${link}">${link}</a>. Действительна 1 час.</p>`,
  });
}

async function sendDbReady(email, dbName, webUrl) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `База 1С "${dbName}" готова — O-Horizons Портал`,
    html: `<p>Ваша база <b>${dbName}</b> успешно создана.</p>
           <p>Ссылка для входа: <a href="${webUrl}">${webUrl}</a></p>`,
  });
}

async function sendDbError(email, dbName, error) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Ошибка создания базы "${dbName}" — O-Horizons`,
    html: `<p>При создании базы <b>${dbName}</b> возникла ошибка. Наша команда уведомлена.</p>`,
  });
}

const mailService = { sendVerification, sendPasswordReset, sendDbReady, sendDbError };
module.exports = { mailService };
