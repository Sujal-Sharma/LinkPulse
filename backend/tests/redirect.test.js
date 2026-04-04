/**
 * Redirect flow tests
 *
 * Tests the most critical path in the system: GET /r/:code
 * Uses in-memory mocks for Redis and MongoDB to test logic in isolation.
 */

const request = require('supertest')

// ─── Mock external dependencies before loading app ───────────────────────────

// Mock Redis
jest.mock('../src/config/redis', () => {
  const store = {}
  const bits = {}
  const mockRedis = {
    status: 'ready',
    get: jest.fn(async (key) => store[key] || null),
    setex: jest.fn(async (key, ttl, val) => { store[key] = val }),
    del: jest.fn(async (key) => { delete store[key] }),
    eval: jest.fn(async () => [1, 10]),  // token bucket: allowed, 10 remaining
    pipeline: jest.fn(() => {
      const cmds = []
      const pipe = {
        incr: jest.fn(() => pipe),
        expire: jest.fn(() => pipe),
        get: jest.fn(() => pipe),
        setbit: jest.fn(() => pipe),
        getbit: jest.fn(() => pipe),
        exec: jest.fn(async () => cmds.map(() => [null, 0])),
      }
      return pipe
    }),
    getbit: jest.fn(async () => 0),    // bloom: not in filter
    setbit: jest.fn(async () => 0),
    bitcount: jest.fn(async () => 0),
    lpush: jest.fn(async () => 1),
    ltrim: jest.fn(async () => 'OK'),
    lrange: jest.fn(async () => []),
    zincrby: jest.fn(async () => '1'),
    zrevrange: jest.fn(async () => []),
    exists: jest.fn(async () => 0),
    on: jest.fn(),
    quit: jest.fn(async () => 'OK'),
    _store: store,
  }
  return {
    getRedisClient: jest.fn(() => mockRedis),
    closeRedis: jest.fn(),
    _mockRedis: mockRedis,
  }
})

// Mock Bull queues
jest.mock('../src/config/bull', () => ({
  createQueue: jest.fn(() => ({
    add: jest.fn(async () => ({ id: 'mock-job-1' })),
    process: jest.fn(),
    on: jest.fn(),
    getWaitingCount: jest.fn(async () => 0),
    close: jest.fn(async () => {}),
  })),
  closeAllQueues: jest.fn(),
}))

// Mock Socket.io
jest.mock('../src/socket', () => ({
  initSocket: jest.fn(),
  emitToLink: jest.fn(),
  emitToUser: jest.fn(),
  broadcast: jest.fn(),
}))

// Mock cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}))

// ─── Test setup ───────────────────────────────────────────────────────────────

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server') || { MongoMemoryServer: null }

let mongod
let app

beforeAll(async () => {
  // Use real mongoose with in-memory server if available, else mock
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server')
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
  } catch (_) {
    // mongodb-memory-server not installed — use mock
    process.env.MONGODB_URI = 'mongodb://localhost:27017/linkpulse_test'
  }

  process.env.JWT_SECRET = 'test-secret-key-32-characters-long'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-long'
  process.env.NODE_ENV = 'test'

  const { app: expressApp } = require('../src/app')
  app = expressApp
})

afterAll(async () => {
  if (mongod) await mongod.stop()
  await mongoose.connection.close().catch(() => {})
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /r/:code — Redirect flow', () => {
  const Link = require('../src/models/Link') || {}
  const bloomFilter = require('../src/services/bloomFilter')
  const cacheService = require('../src/services/cacheService')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('1. Cache HIT → 301 redirect immediately', async () => {
    // Setup: bloom says exists, cache has URL
    jest.spyOn(bloomFilter, 'mightExist').mockResolvedValue(true)
    jest.spyOn(cacheService, 'getCachedUrl').mockResolvedValue('https://example.com/destination')

    const response = await request(app).get('/r/abc123').redirects(0)

    expect(response.status).toBe(301)
    expect(response.headers.location).toBe('https://example.com/destination')
  })

  test('2. Invalid shortCode → 404 (bloom filter rejection)', async () => {
    jest.spyOn(bloomFilter, 'mightExist').mockResolvedValue(false)

    const response = await request(app).get('/r/nonexistent').redirects(0)

    expect(response.status).toBe(404)
    expect(response.body.code).toBe('LINK_NOT_FOUND')
  })

  test('3. Cache MISS + valid DB record → 301 redirect', async () => {
    jest.spyOn(bloomFilter, 'mightExist').mockResolvedValue(true)
    jest.spyOn(cacheService, 'getCachedUrl').mockResolvedValue(null)
    jest.spyOn(cacheService, 'cacheUrl').mockResolvedValue()

    // Mock Link.findOne to return a link
    const mockLink = {
      shortCode: 'test01',
      originalUrl: 'https://destination.com',
      isActive: true,
      expiresAt: null,
      abTest: { enabled: false },
      maxClicksPerDay: null,
      analytics: { clicksToday: 0 },
    }
    jest.spyOn(require('../src/models/Link'), 'findOne').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockLink),
    })

    const response = await request(app).get('/r/test01').redirects(0)

    expect(response.status).toBe(301)
    expect(response.headers.location).toBe('https://destination.com')
  })

  test('4. Expired link → 410 Gone', async () => {
    jest.spyOn(bloomFilter, 'mightExist').mockResolvedValue(true)
    jest.spyOn(cacheService, 'getCachedUrl').mockResolvedValue(null)
    jest.spyOn(cacheService, 'invalidateUrl').mockResolvedValue()

    const pastDate = new Date(Date.now() - 1000)
    const mockLink = {
      shortCode: 'exp001',
      originalUrl: 'https://expired.com',
      isActive: true,
      expiresAt: pastDate,
      abTest: { enabled: false },
      maxClicksPerDay: null,
      analytics: { clicksToday: 0 },
    }
    jest.spyOn(require('../src/models/Link'), 'findOne').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockLink),
    })
    jest.spyOn(require('../src/models/Link'), 'updateOne').mockResolvedValue({})

    const response = await request(app).get('/r/exp001').redirects(0)

    expect(response.status).toBe(410)
    expect(response.body.code).toBe('LINK_EXPIRED')
  })

  test('5. A/B test — routes to correct variant by weight', async () => {
    jest.spyOn(bloomFilter, 'mightExist').mockResolvedValue(true)
    jest.spyOn(cacheService, 'getCachedUrl').mockResolvedValue(null)
    jest.spyOn(cacheService, 'cacheUrl').mockResolvedValue()

    const mockLink = {
      shortCode: 'abtest1',
      originalUrl: 'https://original.com',
      isActive: true,
      expiresAt: null,
      maxClicksPerDay: null,
      analytics: { clicksToday: 0 },
      abTest: {
        enabled: true,
        variantA: { url: 'https://variant-a.com', weight: 100 }, // 100% → always A
        variantB: { url: 'https://variant-b.com', weight: 0 },
      },
    }
    jest.spyOn(require('../src/models/Link'), 'findOne').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockLink),
    })

    const response = await request(app).get('/r/abtest1').redirects(0)

    expect(response.status).toBe(301)
    expect(response.headers.location).toBe('https://variant-a.com')
  })

  test('6. Analytics job queued after redirect (non-blocking)', async () => {
    jest.spyOn(bloomFilter, 'mightExist').mockResolvedValue(true)
    jest.spyOn(cacheService, 'getCachedUrl').mockResolvedValue('https://example.com')

    const analyticsQueue = require('../src/queues/analyticsQueue')
    const addSpy = jest.spyOn(analyticsQueue, 'add').mockResolvedValue({ id: '1' })

    await request(app).get('/r/abc123').redirects(0)

    // Queue should have been called after the redirect
    expect(addSpy).toHaveBeenCalledWith(
      'processClick',
      expect.objectContaining({ shortCode: 'abc123' }),
      expect.any(Object)
    )
  })

  test('7. Cache HIT latency should be fast (< 50ms in test env)', async () => {
    jest.spyOn(bloomFilter, 'mightExist').mockResolvedValue(true)
    jest.spyOn(cacheService, 'getCachedUrl').mockResolvedValue('https://example.com')

    const start = Date.now()
    await request(app).get('/r/abc123').redirects(0)
    const elapsed = Date.now() - start

    // In test env with mocks, should be well under 50ms
    expect(elapsed).toBeLessThan(50)
  })

  test('8. Rate limit headers present in all responses', async () => {
    jest.spyOn(bloomFilter, 'mightExist').mockResolvedValue(false)

    const response = await request(app).get('/r/anycode').redirects(0)

    expect(response.headers['x-ratelimit-limit']).toBeDefined()
    expect(response.headers['x-ratelimit-remaining']).toBeDefined()
  })
})
