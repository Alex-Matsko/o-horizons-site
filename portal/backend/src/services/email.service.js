import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  try {
    const t = getTransporter();
    await t.sendMail({
      from: `"O-Horizons 1C Portal" <${process.env.SMTP_FROM || 'no-reply@o-horizons.com'}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error('Email send error:', err.message);
    // Don't throw — email failure shouldn't break the request
  }
}
