const Redis = require('ioredis')
const config = require('./index')
const logger = require('../utils/logger')

let redis

function createRedisClient() {
  const options = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    reconnectOnError(err) {
      const targetError = 'READONLY'
      if (err.message.includes(targetError)) {
        return true
      }
      return false
    },
  }

  if (config.redis.tls) {
    options.tls = config.redis.tls
  }

  const client = new Redis(config.redis.url, options)

  client.on('connect', () => {
    logger.info('Redis client connected')
  })

  client.on('ready', () => {
    logger.info('Redis client ready')
  })

  client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message })
  })

  client.on('close', () => {
    logger.warn('Redis client connection closed')
  })

  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting...')
  })

  return client
}

function getRedisClient() {
  if (!redis) {
    redis = createRedisClient()
  }
  return redis
}

async function closeRedis() {
  if (redis) {
    await redis.quit()
    redis = null
  }
}

module.exports = { getRedisClient, closeRedis }
