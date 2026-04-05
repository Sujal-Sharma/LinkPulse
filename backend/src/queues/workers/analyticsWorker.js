const UAParser = require('ua-parser-js')
const geoip = require('geoip-lite')
const analyticsQueue = require('../analyticsQueue')
const emailQueue = require('../emailQueue')
const ClickEvent = require('../../models/ClickEvent')
const Link = require('../../models/Link')
const cacheService = require('../../services/cacheService')
const { anonymizeIp, extractDomain } = require('../../utils/helpers')
const logger = require('../../utils/logger')
const metrics = require('../../utils/metrics')

// Lazy-import socket service to avoid circular dependency
let socketService = null
function getSocket() {
  if (!socketService) {
    try {
      socketService = require('../../socket')
    } catch (_) {}
  }
  return socketService
}

analyticsQueue.process('processClick', 5, async (job) => {
  const {
    shortCode,
    ip,
    userAgent,
    referrer,
    clickedAt,
    cacheHit,
    latencyMs,
  } = job.data

  // 1. Parse user agent
  const ua = new UAParser(userAgent || '').getResult()
  const browser = ua.browser.name || 'Unknown'
  const browserVersion = ua.browser.version || ''
  const os = ua.os.name || 'Unknown'
  const deviceType = ua.device.type || 'desktop'

  // 2. Geo lookup
  let cleanIp = (ip || '').replace(/^::ffff:/, '')
  // In development, localhost IPs return null — use a real IP for testing
  const isLocalIp = cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === ''
  if (isLocalIp && process.env.NODE_ENV !== 'production') {
    cleanIp = process.env.DEV_TEST_IP || '103.21.124.0' // Mumbai, India by default
  }
  const geo = geoip.lookup(cleanIp) || {}
  const country = geo.country || 'Unknown'
  const city = geo.city || 'Unknown'
  const region = geo.region || 'Unknown'
  const ll = geo.ll || [0, 0]

  // 3. Parse referrer domain
  const referrerDomain = extractDomain(referrer || 'direct')

  // 4. Find link document
  const link = await Link.findOne({ shortCode })
    .select('_id userId abTest originalUrl')
    .lean()

  if (!link) {
    logger.warn('Analytics: link not found for shortCode', { shortCode })
    return
  }

  // 5. Determine A/B variant
  let variant = null
  if (link.abTest?.enabled && job.data.url) {
    variant = job.data.url === link.abTest.variantA?.url ? 'A' : 'B'
  }

  // 6. Save ClickEvent
  await ClickEvent.create({
    linkId: link._id,
    shortCode,
    clickedAt: new Date(clickedAt),
    ip: anonymizeIp(cleanIp),
    country,
    countryCode: geo.country || 'XX',
    city,
    region,
    latitude: ll[0],
    longitude: ll[1],
    userAgent: userAgent || '',
    browser,
    browserVersion,
    os,
    device: deviceType,
    referrer: referrer || 'direct',
    referrerDomain,
    variant,
  })

  // 7. Increment Redis counters (atomic pipeline)
  await cacheService.incrementClickCounter(shortCode)
  await cacheService.recordGeoClick(shortCode, country, geo.country || 'XX')

  // 8. Buffer for live feed
  await cacheService.bufferClickEvent(shortCode, {
    country,
    countryCode: geo.country || 'XX',
    city,
    device: deviceType,
    browser,
    referrerDomain,
    timestamp: clickedAt,
  })

  // 9. Update MongoDB link analytics
  await Link.updateOne(
    { shortCode },
    {
      $inc: {
        'analytics.totalClicks': 1,
        'analytics.clicksToday': 1,
        'analytics.clicksThisWeek': 1,
        'analytics.clicksThisMonth': 1,
      },
      $set: { 'analytics.lastClickAt': new Date(clickedAt) },
    }
  )

  // 10. Emit real-time update via Socket.io
  const socket = getSocket()
  if (socket?.emitToLink) {
    socket.emitToLink(shortCode, 'click:new', {
      country,
      countryCode: geo.country || 'XX',
      city,
      device: deviceType,
      browser,
      referrerDomain,
      timestamp: clickedAt,
    })

    // Also emit updated stats
    const stats = await cacheService.getClickStats(shortCode)
    socket.emitToLink(shortCode, 'stats:update', stats)
  }

  // 11. Track metrics
  metrics.increment('queue.jobsProcessed')
  metrics.recordLatency(latencyMs || 0)

  logger.info('Click processed', {
    shortCode,
    country,
    device: deviceType,
    cacheHit,
    latencyMs,
  })
})

analyticsQueue.on('failed', () => {
  metrics.increment('queue.jobsFailed')
})

module.exports = analyticsQueue
