const Link = require('../models/Link')
const cacheService = require('./cacheService')
const bloomFilter = require('./bloomFilter')
const { generateShortCode, isValidShortCode } = require('../utils/shortCode')
const logger = require('../utils/logger')
const metrics = require('../utils/metrics')

/**
 * Create a new short link.
 * Handles custom codes, expiry, A/B test setup.
 */
async function createLink(data, userId) {
  const {
    originalUrl,
    customCode,
    title,
    tags,
    expiresAt,
    password,
    maxClicksPerDay,
    abTest,
    workspaceId,
  } = data

  // Determine short code
  let shortCode

  if (customCode) {
    if (!isValidShortCode(customCode)) {
      throw Object.assign(new Error('Invalid custom code format'), { statusCode: 400 })
    }
    // Check if custom code is already taken
    const existing = await Link.findOne({ shortCode: customCode }).lean()
    if (existing) {
      throw Object.assign(new Error('Custom code already taken'), { statusCode: 409 })
    }
    shortCode = customCode
  } else {
    // Generate unique code (retry up to 5 times)
    let attempts = 0
    do {
      shortCode = generateShortCode()
      const inBloom = await bloomFilter.mightExist(shortCode)
      if (!inBloom) break
      // In bloom — check DB to confirm
      const exists = await Link.findOne({ shortCode }).lean()
      if (!exists) break
      attempts++
    } while (attempts < 5)
  }

  // Build link document
  const linkData = {
    shortCode,
    originalUrl,
    userId,
    title: title || '',
    tags: tags || [],
    isActive: true,
    workspaceId: workspaceId || null,
  }

  if (expiresAt) linkData.expiresAt = new Date(expiresAt)
  if (password) linkData.password = password
  if (maxClicksPerDay) linkData.maxClicksPerDay = maxClicksPerDay

  if (abTest?.enabled) {
    linkData.abTest = {
      enabled: true,
      variantA: { url: abTest.variantA.url, weight: abTest.variantA.weight ?? 50 },
      variantB: { url: abTest.variantB.url, weight: abTest.variantB.weight ?? 50 },
    }
  }

  const link = await Link.create(linkData)

  // Cache in Redis
  const ttl = expiresAt
    ? Math.max(1, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
    : 86400
  await cacheService.cacheUrl(shortCode, originalUrl, ttl)

  // Add to Bloom filter
  await bloomFilter.add(shortCode)

  // Schedule expiry job if needed
  if (expiresAt) {
    const delay = new Date(expiresAt) - Date.now()
    if (delay > 0) {
      // Lazy-require to avoid circular dependencies
      const { createQueue } = require('../config/bull')
      const expiryQueue = createQueue('expiry')
      await expiryQueue.add(
        'expireLink',
        { shortCode, linkId: link._id.toString() },
        {
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          jobId: `expire:${shortCode}`,
        }
      )
    }
  }

  metrics.increment('links.created')
  logger.info('Link created', { shortCode, userId: userId.toString() })

  return link
}

/**
 * Get a link by shortCode — cache first.
 */
async function getLinkByCode(shortCode) {
  const cached = await cacheService.getCachedUrl(shortCode)
  if (cached) return { originalUrl: cached, fromCache: true }

  const link = await Link.findOne({ shortCode, isActive: true }).lean()
  return link ? { ...link, fromCache: false } : null
}

/**
 * Update a link.
 */
async function updateLink(linkId, userId, updates) {
  const link = await Link.findOne({ _id: linkId, userId })
  if (!link) {
    throw Object.assign(new Error('Link not found'), { statusCode: 404 })
  }

  const allowed = ['title', 'tags', 'isActive', 'expiresAt', 'maxClicksPerDay', 'abTest']
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      link[key] = updates[key]
    }
  }

  await link.save()

  // Invalidate cache so next redirect fetches fresh data
  await cacheService.invalidateUrl(link.shortCode)

  return link
}

/**
 * Delete (soft-delete) a link.
 */
async function deleteLink(linkId, userId) {
  const link = await Link.findOne({ _id: linkId, userId })
  if (!link) {
    throw Object.assign(new Error('Link not found'), { statusCode: 404 })
  }

  await Link.deleteOne({ _id: linkId })
  await cacheService.invalidateUrl(link.shortCode)

  logger.info('Link deleted', { shortCode: link.shortCode, userId: userId.toString() })
  return true
}

/**
 * List links for a user with pagination.
 */
async function listLinks(userId, { page = 1, limit = 20, search, tag, isActive } = {}) {
  const query = { userId }

  if (search) {
    query.$or = [
      { shortCode: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { originalUrl: { $regex: search, $options: 'i' } },
    ]
  }

  if (tag) query.tags = tag
  if (isActive !== undefined) query.isActive = isActive === 'true' || isActive === true

  const skip = (page - 1) * limit
  const [links, total] = await Promise.all([
    Link.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Link.countDocuments(query),
  ])

  return {
    links,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  }
}

module.exports = { createLink, getLinkByCode, updateLink, deleteLink, listLinks }
