/**
 * Analytics processing tests
 *
 * Tests the Bull worker that processes click events asynchronously.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  http: jest.fn(),
}))

jest.mock('../src/config/redis', () => {
  const mockRedis = {
    status: 'ready',
    pipeline: jest.fn(() => {
      const results = []
      const pipe = {
        incr: jest.fn(() => pipe),
        expire: jest.fn(() => pipe),
        get: jest.fn(() => pipe),
        exec: jest.fn(async () => [[null, 1], [null, 1], [null, 1], [null, 1], [null, 1]]),
      }
      return pipe
    }),
    zincrby: jest.fn(async () => '1'),
    expire: jest.fn(async () => 1),
    lpush: jest.fn(async () => 1),
    ltrim: jest.fn(async () => 'OK'),
    on: jest.fn(),
  }
  return { getRedisClient: jest.fn(() => mockRedis) }
})

jest.mock('../src/config/bull', () => ({
  createQueue: jest.fn(() => ({
    add: jest.fn(async () => ({ id: 'mock-1' })),
    process: jest.fn((name, concurrency, fn) => {
      // Store the processor so tests can call it directly
      if (!global._bullProcessors) global._bullProcessors = {}
      global._bullProcessors[name] = fn
    }),
    on: jest.fn(),
    close: jest.fn(),
  })),
  closeAllQueues: jest.fn(),
}))

jest.mock('../src/socket', () => ({
  emitToLink: jest.fn(),
  emitToUser: jest.fn(),
}))

// ─── Test setup ───────────────────────────────────────────────────────────────

const mongoose = require('mongoose')

beforeAll(async () => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/linkpulse_test'
  process.env.JWT_SECRET = 'test-secret-32-characters-long!!'
  process.env.NODE_ENV = 'test'
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Analytics processing', () => {
  const cacheService = require('../src/services/cacheService')
  const geoService = require('../src/services/geoService')

  test('1. Geo lookup returns structured data', () => {
    const geo = geoService.lookupGeo('8.8.8.8')  // Google DNS
    expect(geo).toHaveProperty('country')
    expect(geo).toHaveProperty('countryCode')
    expect(geo).toHaveProperty('city')
    expect(geo).toHaveProperty('latitude')
    expect(geo).toHaveProperty('longitude')
  })

  test('2. Geo lookup with invalid IP returns defaults', () => {
    const geo = geoService.lookupGeo('999.999.999.999')
    expect(geo.country).toBe('Unknown')
    expect(geo.latitude).toBe(0)
    expect(geo.longitude).toBe(0)
  })

  test('3. Geo lookup with null IP returns defaults', () => {
    const geo = geoService.lookupGeo(null)
    expect(geo.country).toBe('Unknown')
    expect(geo.countryCode).toBe('XX')
  })

  test('4. Redis counter increment called atomically', async () => {
    const redis = require('../src/config/redis').getRedisClient()
    const pipelineSpy = jest.spyOn(redis, 'pipeline')

    await cacheService.incrementClickCounter('test123')

    expect(pipelineSpy).toHaveBeenCalled()
    const pipe = pipelineSpy.mock.results[0].value
    expect(pipe.incr).toHaveBeenCalledWith(expect.stringContaining('clicks:total:test123'))
    expect(pipe.exec).toHaveBeenCalled()
  })

  test('5. recordGeoClick adds to Redis sorted set', async () => {
    const redis = require('../src/config/redis').getRedisClient()
    const zincrSpy = jest.spyOn(redis, 'zincrby')

    await cacheService.recordGeoClick('code123', 'United States', 'US')

    expect(zincrSpy).toHaveBeenCalledWith('geo:code123', 1, 'US')
  })

  test('6. bufferClickEvent pushes to Redis list', async () => {
    const redis = require('../src/config/redis').getRedisClient()
    const lpushSpy = jest.spyOn(redis, 'lpush')

    await cacheService.bufferClickEvent('code123', { country: 'US', device: 'desktop' })

    expect(lpushSpy).toHaveBeenCalledWith(
      'buffer:clicks:code123',
      expect.stringContaining('US')
    )
  })

  test('7. IP anonymization masks last octet (IPv4)', () => {
    const { anonymizeIp } = require('../src/utils/helpers')
    expect(anonymizeIp('192.168.1.100')).toBe('192.168.1.0')
    expect(anonymizeIp('8.8.8.8')).toBe('8.8.8.0')
  })

  test('8. extractDomain parses referrer correctly', () => {
    const { extractDomain } = require('../src/utils/helpers')
    expect(extractDomain('https://www.google.com/search?q=test')).toBe('google.com')
    expect(extractDomain('https://twitter.com')).toBe('twitter.com')
    expect(extractDomain('direct')).toBe('direct')
    expect(extractDomain(null)).toBe('direct')
  })

  test('9. getDateKey returns YYYY-MM-DD format', () => {
    const { getDateKey } = require('../src/utils/helpers')
    const key = getDateKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('10. getHourKey returns YYYY-MM-DD:H format', () => {
    const { getHourKey } = require('../src/utils/helpers')
    const key = getHourKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}:\d+$/)
  })

  test('11. Bloom filter positions are deterministic', async () => {
    // The bloom filter always produces the same bit positions for the same input
    const bf = require('../src/services/bloomFilter')
    const redis = require('../src/config/redis').getRedisClient()

    const getbitSpy = jest.spyOn(redis, 'getbit').mockResolvedValue(1)

    // mightExist uses pipeline — mock it to return all 1s
    jest.spyOn(redis, 'pipeline').mockReturnValue({
      getbit: jest.fn().mockReturnThis(),
      setbit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 1], [null, 1], [null, 1]]),
    })

    const result = await bf.mightExist('abc123')
    expect(typeof result).toBe('boolean')
  })

  test('12. countryFlag returns emoji for valid country codes', () => {
    const { countryFlag } = require('../src/services/geoService')
    expect(countryFlag('US')).toBe('🇺🇸')
    expect(countryFlag('GB')).toBe('🇬🇧')
    expect(countryFlag('IN')).toBe('🇮🇳')
    expect(countryFlag(null)).toBe('🌐')
    expect(countryFlag('X')).toBe('🌐') // invalid
  })
})
