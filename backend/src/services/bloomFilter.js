const { getRedisClient } = require('../config/redis')
const config = require('../config')
const logger = require('../utils/logger')

const REDIS_KEY = config.bloom.redisKey
const SIZE = config.bloom.size
const NUM_HASH_FUNCTIONS = config.bloom.numHashFunctions

/**
 * Polynomial rolling hash with a given seed.
 * Returns a position in [0, size).
 */
function hash(item, seed) {
  let h = seed
  for (let i = 0; i < item.length; i++) {
    h = ((h * seed) + item.charCodeAt(i)) >>> 0 // keep 32-bit unsigned
  }
  return Math.abs(h) % SIZE
}

/**
 * Compute all bit positions for an item.
 */
function getPositions(item) {
  const seeds = [31, 37, 41, 43, 47].slice(0, NUM_HASH_FUNCTIONS)
  return seeds.map(seed => hash(item, seed))
}

/**
 * Add item to Bloom filter (mark bits in Redis).
 */
async function add(item) {
  const redis = getRedisClient()
  const positions = getPositions(String(item))
  const pipeline = redis.pipeline()
  for (const pos of positions) {
    pipeline.setbit(REDIS_KEY, pos, 1)
  }
  await pipeline.exec()
}

/**
 * Check if item might exist.
 * Returns false = definitely not in set.
 * Returns true  = possibly in set (with ~0.1% false positive rate).
 */
async function mightExist(item) {
  const redis = getRedisClient()
  const positions = getPositions(String(item))
  const pipeline = redis.pipeline()
  for (const pos of positions) {
    pipeline.getbit(REDIS_KEY, pos)
  }
  const results = await pipeline.exec()
  return results.every(([err, bit]) => !err && bit === 1)
}

/**
 * Reset the Bloom filter (clear all bits).
 */
async function reset() {
  const redis = getRedisClient()
  await redis.del(REDIS_KEY)
  logger.warn('Bloom filter reset')
}

/**
 * Approximate number of items added (based on set bits).
 * Uses formula: n ≈ -(m/k) * ln(1 - X/m)
 * where m=size, k=numHashFunctions, X=bits set.
 */
async function estimatedCount() {
  const redis = getRedisClient()
  // BITCOUNT returns total set bits
  const setBits = await redis.bitcount(REDIS_KEY)
  const k = NUM_HASH_FUNCTIONS
  const m = SIZE
  const ratio = setBits / m
  if (ratio >= 1) return Infinity
  return Math.round(-(m / k) * Math.log(1 - ratio))
}

module.exports = { add, mightExist, reset, estimatedCount }
