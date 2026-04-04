/**
 * Rate limiter tests — Token Bucket implementation
 *
 * Tests the Redis Lua-based token bucket algorithm.
 */

// ─── Mock Redis ───────────────────────────────────────────────────────────────

const buckets = {}

const mockRedis = {
  status: 'ready',
  eval: jest.fn(async (script, numKeys, key, capacity, refillRate, now, requested) => {
    const cap = parseFloat(capacity)
    const rate = parseFloat(refillRate)
    const t = parseFloat(now)
    const req = parseFloat(requested)

    if (!buckets[key]) {
      buckets[key] = { tokens: cap, lastRefill: t }
    }

    const bucket = buckets[key]
    const elapsed = Math.max(0, t - bucket.lastRefill)
    const toAdd = elapsed * rate
    bucket.tokens = Math.min(cap, bucket.tokens + toAdd)
    bucket.lastRefill = t

    if (bucket.tokens >= req) {
      bucket.tokens -= req
      return [1, Math.floor(bucket.tokens)]
    } else {
      return [0, Math.floor(bucket.tokens)]
    }
  }),
  on: jest.fn(),
}

jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis),
  closeRedis: jest.fn(),
}))

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  http: jest.fn(),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

const { runTokenBucket, createRateLimiter } = require('../src/middleware/rateLimiter')

describe('Token Bucket Rate Limiter', () => {
  beforeEach(() => {
    // Clear all buckets between tests
    Object.keys(buckets).forEach(k => delete buckets[k])
    jest.clearAllMocks()
  })

  test('1. Under limit → request allowed', async () => {
    const result = await runTokenBucket('test:under', 10, 10 / 60)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(9)
  })

  test('2. Over limit → 429 returned', async () => {
    // Drain the bucket completely
    const key = 'test:over'
    // Set bucket to 0 tokens
    buckets[key] = { tokens: 0, lastRefill: Date.now() / 1000 }

    const result = await runTokenBucket(key, 10, 0.001)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  test('3. At exactly limit → last request allowed', async () => {
    const key = 'test:exact'
    buckets[key] = { tokens: 1, lastRefill: Date.now() / 1000 }

    const result = await runTokenBucket(key, 10, 0.001)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  test('4. After window resets → requests allowed again', async () => {
    const key = 'test:reset'
    // Drain bucket
    buckets[key] = { tokens: 0, lastRefill: Date.now() / 1000 - 120 } // 2 min ago

    // With a refill rate of 1/sec and 120 seconds elapsed: 120 tokens added
    const result = await runTokenBucket(key, 10, 1)
    expect(result.allowed).toBe(true)
  })

  test('5. Different IPs → separate buckets', async () => {
    // Drain bucket for IP1
    buckets['ratelimit:redirect:192.168.1.1'] = { tokens: 0, lastRefill: Date.now() / 1000 }

    const result1 = await runTokenBucket('ratelimit:redirect:192.168.1.1', 60, 60 / 360)
    const result2 = await runTokenBucket('ratelimit:redirect:192.168.1.2', 60, 60 / 360)

    expect(result1.allowed).toBe(false)
    expect(result2.allowed).toBe(true)
  })

  test('6. Different users → separate limits', async () => {
    buckets['ratelimit:create:user1'] = { tokens: 0, lastRefill: Date.now() / 1000 }

    const result1 = await runTokenBucket('ratelimit:create:user1', 10, 10 / 86400)
    const result2 = await runTokenBucket('ratelimit:create:user2', 10, 10 / 86400)

    expect(result1.allowed).toBe(false)
    expect(result2.allowed).toBe(true)
  })

  test('7. Rate limit headers present — middleware test', async () => {
    const limiter = createRateLimiter({
      keyFn: () => 'test:headers',
      capacity: 10,
      refillRate: 10 / 60,
      message: 'Test limit',
    })

    const mockReq = { ip: '127.0.0.1', path: '/test', user: null }
    const mockRes = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headers: {},
    }
    const next = jest.fn()

    await limiter(mockReq, mockRes, next)

    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Limit', 10)
    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number))
    expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number))
    expect(next).toHaveBeenCalled()
  })

  test('8. 429 response includes Retry-After header', async () => {
    const key = 'test:retry-after'
    buckets[key] = { tokens: 0, lastRefill: Date.now() / 1000 }

    const limiter = createRateLimiter({
      keyFn: () => key,
      capacity: 10,
      refillRate: 0.001,
      message: 'Test limit exceeded',
    })

    const mockReq = { ip: '127.0.0.1', path: '/test', user: null }
    const mockRes = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    const next = jest.fn()

    await limiter(mockReq, mockRes, next)

    expect(mockRes.status).toHaveBeenCalledWith(429)
    expect(mockRes.set).toHaveBeenCalledWith('Retry-After', expect.any(Number))
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Rate limit exceeded' })
    )
    expect(next).not.toHaveBeenCalled()
  })

  test('9. skipFn bypasses rate limiting', async () => {
    const limiter = createRateLimiter({
      keyFn: () => 'test:skip',
      capacity: 10,
      refillRate: 0.001,
      skipFn: () => true,  // always skip
    })

    buckets['test:skip'] = { tokens: 0, lastRefill: Date.now() / 1000 }

    const mockReq = { ip: '127.0.0.1', path: '/test', user: null }
    const mockRes = { set: jest.fn(), status: jest.fn(), json: jest.fn() }
    const next = jest.fn()

    await limiter(mockReq, mockRes, next)

    expect(next).toHaveBeenCalled()
    expect(mockRes.set).not.toHaveBeenCalled()
  })
})
