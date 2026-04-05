const nodemailer = require('nodemailer')
const config = require('../config')
const logger = require('../utils/logger')

let transporter = null

function getTransporter() {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('Email not configured — skipping send', { to, subject })
    return { skipped: true }
  }

  try {
    const info = await getTransporter().sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    })
    logger.info('Email sent', { to, subject, messageId: info.messageId })
    return info
  } catch (err) {
    logger.error('Email send failed', { to, subject, error: err.message })
    throw err
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

function welcomeEmail({ name }) {
  return {
    subject: 'Welcome to LinkPulse ⚡',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="color:#7C3AED">⚡ Welcome to LinkPulse, ${name}!</h1>
        <p>Your account is ready. Start shortening links with real-time analytics.</p>
        <a href="${config.app.frontendUrl}/dashboard"
           style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none">
          Go to Dashboard →
        </a>
        <p style="color:#6B6B80;font-size:14px;margin-top:32px">
          LinkPulse — Smart URL Shortener
        </p>
      </div>`,
  }
}

function linkExpiredEmail({ name, shortCode, originalUrl, totalClicks }) {
  return {
    subject: `Your link /${shortCode} has expired`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#EF4444">Link Expired</h2>
        <p>Hi ${name}, your link <strong>${shortCode}</strong> has expired.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr>
            <td style="padding:8px;background:#111118;color:#E8E8F0">Original URL</td>
            <td style="padding:8px">${originalUrl}</td>
          </tr>
          <tr>
            <td style="padding:8px;background:#111118;color:#E8E8F0">Total Clicks</td>
            <td style="padding:8px">${totalClicks}</td>
          </tr>
        </table>
        <a href="${config.app.frontendUrl}/dashboard"
           style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none">
          Create New Link →
        </a>
      </div>`,
  }
}

function dailyReportEmail({ name, links }) {
  const rows = links.map(l => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #1E1E2E">${l.shortCode}</td>
      <td style="padding:8px;border-bottom:1px solid #1E1E2E">${l.title || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #1E1E2E;text-align:right">${l.clicksToday}</td>
      <td style="padding:8px;border-bottom:1px solid #1E1E2E;text-align:right">${l.totalClicks}</td>
    </tr>`).join('')

  return {
    subject: 'Your LinkPulse Daily Report',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#7C3AED">Daily Report for ${name}</h2>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#111118;color:#E8E8F0">
              <th style="padding:8px;text-align:left">Short Code</th>
              <th style="padding:8px;text-align:left">Title</th>
              <th style="padding:8px;text-align:right">Today</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <a href="${config.app.frontendUrl}/dashboard"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none">
          View Full Analytics →
        </a>
      </div>`,
  }
}

function weeklyReportEmail({ workspaceName, to }) {
  return {
    subject: `Weekly Report — ${workspaceName}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#7C3AED">Weekly Report: ${workspaceName}</h2>
        <p>Your workspace weekly analytics digest is ready.</p>
        <a href="${config.app.frontendUrl}/workspace"
           style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none">
          View Workspace Analytics →
        </a>
      </div>`,
  }
}

module.exports = {
  sendMail,
  welcomeEmail,
  linkExpiredEmail,
  dailyReportEmail,
  weeklyReportEmail,
}
