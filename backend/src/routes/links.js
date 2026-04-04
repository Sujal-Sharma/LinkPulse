const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { planAwareLinkLimiter } = require('../middleware/rateLimiter')
const { validate, createLinkSchema, updateLinkSchema } = require('../middleware/validate')
const linkService = require('../services/linkService')
const cacheService = require('../services/cacheService')
const config = require('../config')
const logger = require('../utils/logger')

// All routes require authentication
router.use(authenticate)

// GET /links — list user's links
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, tag, isActive } = req.query
    const result = await linkService.listLinks(req.user.userId, {
      page: parseInt(page, 10),
      limit: Math.min(100, parseInt(limit, 10)),
      search,
      tag,
      isActive,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /links — create new link
router.post(
  '/',
  planAwareLinkLimiter,
  validate(createLinkSchema),
  async (req, res, next) => {
    try {
      const link = await linkService.createLink(req.body, req.user.userId)

      res.status(201).json({
        link,
        shortUrl: `${config.app.baseUrl}/r/${link.shortCode}`,
      })
    } catch (err) {
      next(err)
    }
  }
)

// GET /links/:id — get single link
router.get('/:id', async (req, res, next) => {
  try {
    const Link = require('../models/Link')
    const link = await Link.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).lean()

    if (!link) return res.status(404).json({ error: 'Link not found' })

    // Merge Redis click stats
    const redisStats = await cacheService.getClickStats(link.shortCode)
    res.json({
      link: {
        ...link,
        analytics: {
          ...link.analytics,
          clicksToday: redisStats.today || link.analytics?.clicksToday || 0,
          clicksThisHour: redisStats.thisHour || 0,
        },
      },
      shortUrl: `${config.app.baseUrl}/r/${link.shortCode}`,
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /links/:id — update link
router.patch('/:id', validate(updateLinkSchema), async (req, res, next) => {
  try {
    const link = await linkService.updateLink(req.params.id, req.user.userId, req.body)
    res.json({ link })
  } catch (err) {
    next(err)
  }
})

// DELETE /links/:id — delete link
router.delete('/:id', async (req, res, next) => {
  try {
    await linkService.deleteLink(req.params.id, req.user.userId)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// GET /links/:id/qr — generate QR code info
router.get('/:id/qr', async (req, res, next) => {
  try {
    const Link = require('../models/Link')
    const link = await Link.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    }).lean()

    if (!link) return res.status(404).json({ error: 'Link not found' })

    const shortUrl = `${config.app.baseUrl}/r/${link.shortCode}`
    // Return the URL to generate QR from — frontend uses a QR library
    res.json({
      shortUrl,
      qrDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
