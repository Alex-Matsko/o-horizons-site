'use strict';

const nodemailer  = require('nodemailer');
const { config }  = require('../config/index.js');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   config.smtp.host,
    port:   config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
  return _transporter;
}

async function sendMail({ to, subject, html }) {
  if (!config.smtp.host) {
    console.warn('[mailer] SMTP not configured — skipping email to', to);
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({
    from:    config.smtp.from || config.smtp.user,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
