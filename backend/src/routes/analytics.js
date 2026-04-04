const express = require('express')
const router = express.Router()
const Link = require('../models/Link')
const ClickEvent = require('../models/ClickEvent')
const { authenticate } = require('../middleware/auth')
const { apiRateLimiter } = require('../middleware/rateLimiter')
const analyticsService = require('../services/analyticsService')
const cacheService = require('../services/cacheService')
const logger = require('../utils/logger')

router.use(authenticate)
router.use(apiRateLimiter)

/**
 * Helper — resolve period param to a Date (start of range).
 */
function parsePeriod(period) {
  const days = { '7d': 7, '30d': 30, '90d': 90 }
  if (period === 'all') return null
  const d = days[period] || 30
  const date = new Date()
  date.setDate(date.getDate() - d)
  return date
}

// GET /analytics/overview — user-wide stats
router.get('/overview', async (req, res, next) => {
  try {
    const stats = await analyticsService.getUserStats(req.user.userId)
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

// GET /analytics/:shortCode — full analytics for a link
router.get('/:shortCode', async (req, res, next) => {
  try {
    const { shortCode } = req.params
    const { period = '30d' } = req.query

    const link = await Link.findOne({ shortCode, userId: req.user.userId }).lean()
    if (!link) return res.status(404).json({ error: 'Link not found' })

    const since = parsePeriod(period)
    const linkId = link._id.toString()

    // Run all analytics queries in parallel
    const [timeSeries, countries, cities, devices, browsers, referrers, heatmap, redisStats, recentClicks] =
      await Promise.all([
        analyticsService.getClickTimeSeries(linkId, since ? Math.ceil((Date.now() - since) / 86400000) : 365),
        analyticsService.getTopCountries(linkId, 10),
        analyticsService.getTopCities(linkId, 10),
        analyticsService.getDeviceBreakdown(linkId),
        analyticsService.getBrowserBreakdown(linkId),
        analyticsService.getReferrerBreakdown(linkId),
        analyticsService.getHourlyHeatmap(linkId, 30),
        cacheService.getClickStats(shortCode),
        cacheService.getRecentClicks(shortCode, 20),
      ])

    // Prefer Redis counters (real-time) over MongoDB snapshot
    const totalClicks = redisStats.total || link.analytics?.totalClicks || 0
    const clicksToday = redisStats.today || link.analytics?.clicksToday || 0

    res.json({
      link: {
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        title: link.title,
        isActive: link.isActive,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
      },
      summary: {
        totalClicks,
        uniqueClicks: link.analytics?.uniqueClicks || 0,
        clicksToday,
        clicksThisHour: redisStats.thisHour || 0,
        lastClickAt: link.analytics?.lastClickAt || null,
      },
      timeSeries,
      countries,
      cities,
      devices,
      browsers,
      referrers,
      heatmap,
      recentClicks,
    })
  } catch (err) {
    next(err)
  }
})

// GET /analytics/:shortCode/realtime — live click stats from Redis
router.get('/:shortCode/realtime', async (req, res, next) => {
  try {
    const { shortCode } = req.params

    const link = await Link.findOne({ shortCode, userId: req.user.userId }).select('_id').lean()
    if (!link) return res.status(404).json({ error: 'Link not found' })

    const [stats, topCountries, recentClicks] = await Promise.all([
      cacheService.getClickStats(shortCode),
      cacheService.getTopCountries(shortCode, 5),
      cacheService.getRecentClicks(shortCode, 10),
    ])

    res.json({ shortCode, stats, topCountries, recentClicks })
  } catch (err) {
    next(err)
  }
})

// GET /analytics/:shortCode/export — export click events as CSV
router.get('/:shortCode/export', async (req, res, next) => {
  try {
    const { shortCode } = req.params
    const { period = '30d' } = req.query

    const link = await Link.findOne({ shortCode, userId: req.user.userId }).lean()
    if (!link) return res.status(404).json({ error: 'Link not found' })

    const since = parsePeriod(period)
    const query = { linkId: link._id }
    if (since) query.clickedAt = { $gte: since }

    const events = await ClickEvent.find(query)
      .sort({ clickedAt: -1 })
      .limit(10000)
      .lean()

    const header = 'timestamp,country,city,device,browser,os,referrer\n'
    const rows = events.map(e =>
      [
        new Date(e.clickedAt).toISOString(),
        e.country || '',
        e.city || '',
        e.device || '',
        e.browser || '',
        e.os || '',
        e.referrerDomain || '',
      ].join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${shortCode}-${period}.csv"`)
    res.send(header + rows)
  } catch (err) {
    next(err)
  }
})

module.exports = router
