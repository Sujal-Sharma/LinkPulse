const Bull = require('bull')
const config = require('./index')
const logger = require('../utils/logger')

const queues = {}

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 50,
}

function createQueue(name) {
  if (queues[name]) return queues[name]

  const redisUrl = config.redis.url
  const isUpstash = redisUrl.startsWith('rediss://')

  // Bull accepts the Redis URL as a string directly (second arg),
  // not as { url: ... }. For TLS (Upstash rediss://) we must also
  // pass tls options or Bull falls back to 127.0.0.1:6379.
  const bullOptions = {
    defaultJobOptions,
    settings: {
      stalledInterval: 30000,
      maxStalledCount: 3,
    },
  }

  if (isUpstash) {
    // Parse the rediss:// URL into host/port/password for Bull's redis option
    const parsed = new URL(redisUrl)
    bullOptions.redis = {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 6380,
      password: parsed.password || undefined,
      tls: { rejectUnauthorized: false },
    }
  } else {
    bullOptions.redis = { url: redisUrl }
  }

  const queue = new Bull(name, bullOptions)

  queue.on('error', (err) => {
    logger.error(`Bull queue [${name}] error`, { error: err.message })
  })

  queue.on('failed', (job, err) => {
    logger.error(`Bull job failed`, {
      queue: name,
      jobId: job.id,
      attempts: job.attemptsMade,
      error: err.message,
    })
  })

  queue.on('stalled', (job) => {
    logger.warn(`Bull job stalled`, { queue: name, jobId: job.id })
  })

  queues[name] = queue
  return queue
}

async function closeAllQueues() {
  await Promise.all(Object.values(queues).map(q => q.close()))
}

module.exports = { createQueue, closeAllQueues }
