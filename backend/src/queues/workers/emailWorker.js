const emailQueue = require('../emailQueue')
const emailService = require('../../services/emailService')
const logger = require('../../utils/logger')

// Concurrency 2 — don't hammer the SMTP server
emailQueue.process('welcomeEmail', 2, async (job) => {
  const { to, name } = job.data
  const template = emailService.welcomeEmail({ name })
  await emailService.sendMail({ to, ...template })
})

emailQueue.process('linkExpired', 2, async (job) => {
  const { to, name, shortCode, originalUrl, totalClicks } = job.data
  const template = emailService.linkExpiredEmail({ name, shortCode, originalUrl, totalClicks })
  await emailService.sendMail({ to, ...template })
})

emailQueue.process('dailyReport', 2, async (job) => {
  const { to, name, links } = job.data
  if (!links || links.length === 0) return
  const template = emailService.dailyReportEmail({ name, links })
  await emailService.sendMail({ to, ...template })
})

emailQueue.process('weeklyReport', 2, async (job) => {
  const { to, workspaceName } = job.data
  const template = emailService.weeklyReportEmail({ workspaceName, to })
  await emailService.sendMail({ to, ...template })
})

logger.info('Email worker started')

module.exports = emailQueue
