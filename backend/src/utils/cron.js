const cron = require('node-cron')
const User = require('../models/User')
const Link = require('../models/Link')
const Workspace = require('../models/Workspace')
const cacheService = require('../services/cacheService')
const emailQueue = require('../queues/emailQueue')
const logger = require('../utils/logger')

function startCronJobs() {
  // ── Daily analytics digest: 9 AM every day ──────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    const start = Date.now()
    logger.info('Cron: daily digest started')

    try {
      const users = await User.find({ emailVerified: true }).lean()

      for (const user of users) {
        const links = await Link.find({
          userId: user._id,
          'analytics.clicksToday': { $gt: 0 },
        }).lean()

        if (links.length > 0) {
          await emailQueue.add(
            'dailyReport',
            {
              to: user.email,
              name: user.name,
              links: links.map(l => ({
                shortCode: l.shortCode,
                title: l.title,
                clicksToday: l.analytics.clicksToday,
                totalClicks: l.analytics.totalClicks,
              })),
            },
            { attempts: 2 }
          )
        }
      }

      logger.info('Cron: daily digest complete', {
        users: users.length,
        durationMs: Date.now() - start,
      })
    } catch (err) {
      logger.error('Cron: daily digest failed', { error: err.message })
    }
  })

  // ── Reset daily counters: midnight every day ─────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    const start = Date.now()
    logger.info('Cron: reset daily counters started')

    try {
      await Link.updateMany({}, { $set: { 'analytics.clicksToday': 0 } })
      // Redis daily keys auto-expire via TTL set in cacheService
      logger.info('Cron: daily counters reset', { durationMs: Date.now() - start })
    } catch (err) {
      logger.error('Cron: reset daily counters failed', { error: err.message })
    }
  })

  // ── Reset weekly counters: Sunday midnight ───────────────────────────────
  cron.schedule('0 0 * * 0', async () => {
    try {
      await Link.updateMany({}, { $set: { 'analytics.clicksThisWeek': 0 } })
      logger.info('Cron: weekly counters reset')
    } catch (err) {
      logger.error('Cron: reset weekly counters failed', { error: err.message })
    }
  })

  // ── Weekly report: Sunday 10 AM ───────────────────────────────────────────
  cron.schedule('0 10 * * 0', async () => {
    logger.info('Cron: weekly reports started')

    try {
      const workspaces = await Workspace.find()
        .populate('ownerId', 'email name')
        .lean()

      for (const ws of workspaces) {
        if (ws.ownerId?.email) {
          await emailQueue.add(
            'weeklyReport',
            {
              to: ws.ownerId.email,
              workspaceName: ws.name,
            },
            { attempts: 2 }
          )
        }
      }

      logger.info('Cron: weekly reports queued', { count: workspaces.length })
    } catch (err) {
      logger.error('Cron: weekly reports failed', { error: err.message })
    }
  })

  // ── Backup expiry check: every hour (Bull jobs are primary) ───────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const expired = await Link.find({
        expiresAt: { $lte: new Date() },
        isActive: true,
      }).lean()

      if (expired.length === 0) return

      for (const link of expired) {
        await Link.updateOne({ _id: link._id }, { isActive: false, updatedAt: new Date() })
        await cacheService.invalidateUrl(link.shortCode)
        logger.info('Cron expired link', { shortCode: link.shortCode })
      }

      logger.info('Cron: hourly expiry check', { expired: expired.length })
    } catch (err) {
      logger.error('Cron: expiry check failed', { error: err.message })
    }
  })

  logger.info('Cron jobs registered')
}

module.exports = { startCronJobs }
