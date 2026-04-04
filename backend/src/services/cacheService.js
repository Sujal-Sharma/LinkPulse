const { getRedisClient } = require('../config/redis')
const { getDateKey, getHourKey } = require('../utils/helpers')
const logger = require('../utils/logger')

// ─── URL CACHING ─────────────────────────────────────────────────────────────

async function cacheUrl(shortCode, originalUrl, ttlSeconds = 86400) {
  const redis = getRedisClient()
  await redis.setex(`url:${shortCode}`, ttlSeconds, originalUrl)
}

async function getCachedUrl(shortCode) {
  const redis = getRedisClient()
  return await redis.get(`url:${shortCode}`)
}

async function invalidateUrl(shortCode) {
  const redis = getRedisClient()
  await redis.del(`url:${shortCode}`)
}

// ─── CLICK COUNTERS ───────────────────────────────────────────────────────────

async function incrementClickCounter(shortCode) {
  const redis = getRedisClient()
  const dateKey = getDateKey()
  const hourKey = getHourKey()

  const pipeline = redis.pipeline()
  pipeline.incr(`clicks:total:${shortCode}`)
  pipeline.incr(`clicks:today:${shortCode}:${dateKey}`)
  pipeline.incr(`clicks:hour:${shortCode}:${hourKey}`)
  // today key expires in 48h, hour key in 2h
  pipeline.expire(`clicks:today:${shortCode}:${dateKey}`, 172800)
  pipeline.expire(`clicks:hour:${shortCode}:${hourKey}`, 7200)
  await pipeline.exec()
}

async function getClickStats(shortCode) {
  const redis = getRedisClient()
  const dateKey = getDateKey()
  const hourKey = getHourKey()

  const pipeline = redis.pipeline()
  pipeline.get(`clicks:total:${shortCode}`)
  pipeline.get(`clicks:today:${shortCode}:${dateKey}`)
  pipeline.get(`clicks:hour:${shortCode}:${hourKey}`)
  const results = await pipeline.exec()

  return {
    total: parseInt(results[0][1], 10) || 0,
    today: parseInt(results[1][1], 10) || 0,
    thisHour: parseInt(results[2][1], 10) || 0,
  }
}

async function setTotalClicks(shortCode, count) {
  const redis = getRedisClient()
  await redis.set(`clicks:total:${shortCode}`, count)
}

// ─── REAL-TIME ANALYTICS BUFFER ──────────────────────────────────────────────

async function bufferClickEvent(shortCode, eventData) {
  const redis = getRedisClient()
  const key = `buffer:clicks:${shortCode}`
  await redis.lpush(key, JSON.stringify(eventData))
  await redis.ltrim(key, 0, 99)   // keep last 100 events
  await redis.expire(key, 3600)   // expire after 1h
}

async function getRecentClicks(shortCode, count = 10) {
  const redis = getRedisClient()
  const events = await redis.lrange(`buffer:clicks:${shortCode}`, 0, count - 1)
  return events.map(e => {
    try { return JSON.parse(e) } catch (_) { return null }
  }).filter(Boolean)
}

// ─── GEOGRAPHIC TRACKING ──────────────────────────────────────────────────────

async function recordGeoClick(shortCode, country, countryCode) {
  const redis = getRedisClient()
  const code = countryCode || country || 'XX'
  await redis.zincrby(`geo:${shortCode}`, 1, code)
  await redis.expire(`geo:${shortCode}`, 2592000) // 30 days
}

async function getTopCountries(shortCode, limit = 10) {
  const redis = getRedisClient()
  const results = await redis.zrevrange(`geo:${shortCode}`, 0, limit - 1, 'WITHSCORES')
  const parsed = []
  for (let i = 0; i < results.length; i += 2) {
    parsed.push({
      countryCode: results[i],
      clicks: parseInt(results[i + 1], 10),
    })
  }
  return parsed
}

// ─── SESSION STORAGE ─────────────────────────────────────────────────────────

async function setSession(userId, sessionData, ttl = 604800) {
  const redis = getRedisClient()
  await redis.setex(`session:${userId}`, ttl, JSON.stringify(sessionData))
}

async function getSession(userId) {
  const redis = getRedisClient()
  const data = await redis.get(`session:${userId}`)
  return data ? JSON.parse(data) : null
}

async function deleteSession(userId) {
  const redis = getRedisClient()
  await redis.del(`session:${userId}`)
}

// ─── REFRESH TOKEN BLACKLIST ──────────────────────────────────────────────────

async function blacklistToken(token, ttlSeconds) {
  const redis = getRedisClient()
  await redis.setex(`blacklist:${token}`, ttlSeconds, '1')
}

async function isTokenBlacklisted(token) {
  const redis = getRedisClient()
  return (await redis.exists(`blacklist:${token}`)) === 1
}

// ─── GENERAL CACHE ────────────────────────────────────────────────────────────

async function set(key, value, ttlSeconds) {
  const redis = getRedisClient()
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } else {
    await redis.set(key, JSON.stringify(value))
  }
}

async function get(key) {
  const redis = getRedisClient()
  const val = await redis.get(key)
  if (!val) return null
  try { return JSON.parse(val) } catch (_) { return val }
}

async function del(key) {
  const redis = getRedisClient()
  await redis.del(key)
}

module.exports = {
  cacheUrl,
  getCachedUrl,
  invalidateUrl,
  incrementClickCounter,
  getClickStats,
  setTotalClicks,
  bufferClickEvent,
  getRecentClicks,
  recordGeoClick,
  getTopCountries,
  setSession,
  getSession,
  deleteSession,
  blacklistToken,
  isTokenBlacklisted,
  set,
  get,
  del,
}
