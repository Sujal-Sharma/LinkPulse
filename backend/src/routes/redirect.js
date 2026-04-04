const express = require('express')
const router = express.Router()
const Link = require('../models/Link')
const cacheService = require('../services/cacheService')
const bloomFilter = require('../services/bloomFilter')
const analyticsQueue = require('../queues/analyticsQueue')
const { redirectRateLimiter } = require('../middleware/rateLimiter')
const logger = require('../utils/logger')
const metrics = require('../utils/metrics')

/**
 * GET /r/:code
 *
 * Critical path — every millisecond matters.
 * Target: < 5ms on cache HIT, < 15ms on cache MISS.
 *
 * Flow:
 *   1. Bloom filter check (reject invalid codes with zero DB/Redis load)
 *   2. Redis cache lookup
 *   3. MongoDB fallback (cache miss)
 *   4. 301 redirect immediately
 *   5. Push to Bull queue asynchronously (never blocks redirect)
 */
router.get('/:code', redirectRateLimiter, async (req, res) => {
  const { code } = req.params
  const startTime = Date.now()

  metrics.increment('redirects.total')

  try {
    // STEP 1: Bloom filter — O(1) rejection of definitely-invalid codes
    const mightExist = await bloomFilter.mightExist(code)
    if (!mightExist) {
      metrics.increment('redirects.notFound')
      logger.info('Bloom filter rejection', { code, latencyMs: Date.now() - startTime })
      return res.status(404).json({ error: 'Link not found', code: 'LINK_NOT_FOUND' })
    }

    // STEP 2: Redis cache lookup (O(1), ~1ms)
    let cachedData = await cacheService.getCachedUrl(code)
    let cacheHit = cachedData !== null
    let originalUrl = null
    let selectedUrl = null

    // Cached value may be a plain URL string or a JSON object (for A/B links)
    if (cacheHit) {
      metrics.increment('redirects.cacheHit')
      try {
        const parsed = JSON.parse(cachedData)
        originalUrl = parsed.originalUrl
        // Re-run A/B random selection on every cache hit
        if (parsed.abTest) {
          const random = Math.random() * 100
          selectedUrl = random < (parsed.abTest.variantA?.weight ?? 50)
            ? parsed.abTest.variantA.url
            : parsed.abTest.variantB.url
        } else {
          selectedUrl = originalUrl
        }
      } catch {
        // Plain string URL (non-A/B link)
        originalUrl = cachedData
        selectedUrl = cachedData
      }
    } else {
      metrics.increment('redirects.cacheMiss')

      // STEP 3: MongoDB fallback
      const link = await Link.findOne({ shortCode: code, isActive: true })
        .select('originalUrl expiresAt abTest password maxClicksPerDay analytics')
        .lean()

      if (!link) {
        metrics.increment('redirects.notFound')
        return res.status(404).json({ error: 'Link not found', code: 'LINK_NOT_FOUND' })
      }

      // Check expiry
      if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
        await Link.updateOne({ shortCode: code }, { isActive: false, updatedAt: new Date() })
        await cacheService.invalidateUrl(code)
        return res.status(410).json({
          error: 'Link has expired',
          code: 'LINK_EXPIRED',
          expiredAt: link.expiresAt,
        })
      }

      // Per-link click rate limit
      if (link.maxClicksPerDay && link.analytics?.clicksToday >= link.maxClicksPerDay) {
        return res.status(429).json({
          error: 'This link has reached its daily click limit',
          code: 'LINK_CLICK_LIMIT',
        })
      }

      // A/B test routing
      if (link.abTest?.enabled) {
        const random = Math.random() * 100
        selectedUrl = random < (link.abTest.variantA?.weight ?? 50)
          ? link.abTest.variantA.url
          : link.abTest.variantB.url
      } else {
        selectedUrl = link.originalUrl
      }

      originalUrl = link.originalUrl

      // Cache for next requests
      const ttl = link.expiresAt
        ? Math.max(1, Math.floor((new Date(link.expiresAt) - Date.now()) / 1000))
        : 86400
      const cacheValue = link.abTest?.enabled
        ? JSON.stringify({ originalUrl, abTest: link.abTest })
        : originalUrl
      await cacheService.cacheUrl(code, cacheValue, ttl)
    }

    // STEP 4: Return redirect IMMEDIATELY
    // no-store prevents browser from caching the redirect
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.set('Pragma', 'no-cache')
    const redirectCode = process.env.NODE_ENV === 'production' ? 301 : 302
    res.redirect(redirectCode, selectedUrl || originalUrl)

    // STEP 5: Async analytics — queued AFTER response is sent
    const latencyMs = Date.now() - startTime
    const clickData = {
      shortCode: code,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || 'direct',
      clickedAt: new Date().toISOString(),
      cacheHit,
      latencyMs,
      url: selectedUrl || originalUrl,
    }

    // Non-blocking — user already redirected
    analyticsQueue.add('processClick', clickData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    }).catch(err => {
      logger.error('Failed to queue click event', { code, error: err.message })
    })

    logger.info('Redirect served', { code, latencyMs, cacheHit })
    metrics.recordLatency(latencyMs)

  } catch (error) {
    logger.error('Redirect error', { code, error: error.message, stack: error.stack })
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

module.exports = router
