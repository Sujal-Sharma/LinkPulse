const { getRedisClient } = require('../config/redis')
const logger = require('../utils/logger')
const metrics = require('../utils/metrics')

/**
 * Token Bucket Rate Limiter — implemented from scratch using Redis Lua.
 *
 * Token Bucket algorithm:
 *   - Bucket holds up to `capacity` tokens
 *   - Refills at `refillRate` tokens per second (continuous)
 *   - Each request consumes 1 token
 *   - When bucket is empty → 429 Too Many Requests
 *
 * The Lua script runs atomically on Redis — no race conditions.
 */

const LUA_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1]) or capacity
local lastRefill = tonumber(bucket[2]) or now

-- Calculate tokens to add based on time elapsed (in seconds)
local elapsed = math.max(0, now - lastRefill)
local tokensToAdd = elapsed * refillRate
tokens = math.min(capacity, tokens + tokensToAdd)

if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
  redis.call('EXPIRE', key, 3600)
  return {1, math.floor(tokens)}
else
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
  redis.call('EXPIRE', key, 3600)
  return {0, math.floor(tokens)}
end
`

async function runTokenBucket(key, capacity, refillRate) {
  const redis = getRedisClient()
  const now = Date.now() / 1000  // seconds as float

  const result = await redis.eval(
    LUA_SCRIPT,
    1,
    key,
    capacity.toString(),
    refillRate.toString(),
    now.toString(),
    '1'
  )

  const allowed = result[0] === 1
  const remaining = result[1]
  const retryAfter = allowed ? 0 : Math.ceil(1 / refillRate)

  return { allowed, remaining, retryAfter }
}

/**
 * Factory — creates Express middleware for a given rate-limit profile.
 *
 * options:
 *   keyFn(req)   → string   Redis key prefix for this request
 *   capacity     → number   Max tokens in bucket
 *   refillRate   → number   Tokens replenished per second
 *   message      → string   Error message on 429
 *   skipFn(req)  → bool     Return true to skip limiting
 */
function createRateLimiter(options) {
  const {
    keyFn,
    capacity,
    refillRate,
    message = 'Too many requests. Please try again later.',
    skipFn = () => false,
  } = options

  return async (req, res, next) => {
    if (skipFn(req)) return next()

    const key = keyFn(req)

    try {
      const result = await runTokenBucket(key, capacity, refillRate)

      // Always set headers
      res.set('X-RateLimit-Limit', capacity)
      res.set('X-RateLimit-Remaining', Math.max(0, result.remaining))
      res.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + Math.ceil(capacity / refillRate))

      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter)
        logger.warn('Rate limit exceeded', { key, ip: req.ip, path: req.path })
        metrics.increment('redirects.rateLimited')

        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
          message,
        })
      }

      next()
    } catch (err) {
      // If Redis is down, fail open (don't block requests)
      logger.error('Rate limiter error — failing open', { error: err.message, key })
      next()
    }
  }
}

// ─── PRE-BUILT LIMITERS ───────────────────────────────────────────────────────

/**
 * Redirect rate limiter: 60 requests / 6-minute burst window per IP.
 */
const redirectRateLimiter = createRateLimiter({
  keyFn: (req) => `ratelimit:redirect:${req.ip}`,
  capacity: 60,
  refillRate: 60 / 360,   // 10/min = 0.167/sec
  message: 'Too many requests from this IP. Please slow down.',
})

/**
 * API rate limiter: 100 requests / 5 minutes per user or IP.
 */
const apiRateLimiter = createRateLimiter({
  keyFn: (req) => `ratelimit:api:${req.user?.userId || req.ip}`,
  capacity: 100,
  refillRate: 100 / 300,  // 20/min
  message: 'API rate limit exceeded.',
})

/**
 * Link creation rate limiter — plan-aware.
 * Must be applied AFTER authenticate middleware.
 */
const linkCreationRateLimiter = createRateLimiter({
  keyFn: (req) => `ratelimit:create:${req.user?.userId}`,
  capacity: 10,            // Free plan default; overridden by plan below
  refillRate: 10 / 86400,  // 10/day
  message: 'Daily link creation limit reached. Upgrade your plan for more.',
  skipFn: (req) => !req.user,
})

/**
 * Dynamic link-creation limiter respecting user plan.
 * Use this one instead of linkCreationRateLimiter when plan matters.
 */
function planAwareLinkLimiter(req, res, next) {
  const plan = req.user?.plan || 'free'
  const planLimits = {
    free: { capacity: 10, refillRate: 10 / 86400 },
    pro: { capacity: 50, refillRate: 50 / 86400 },
    team: { capacity: 200, refillRate: 200 / 86400 },
  }
  const limits = planLimits[plan] || planLimits.free

  const limiter = createRateLimiter({
    keyFn: (req) => `ratelimit:create:${req.user?.userId}`,
    ...limits,
    message: 'Daily link creation limit reached. Upgrade your plan.',
  })

  return limiter(req, res, next)
}

module.exports = {
  createRateLimiter,
  redirectRateLimiter,
  apiRateLimiter,
  linkCreationRateLimiter,
  planAwareLinkLimiter,
  runTokenBucket,
}
