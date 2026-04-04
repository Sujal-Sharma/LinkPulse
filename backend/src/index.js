require('dotenv').config()

const { httpServer } = require('./app')
const { connectMongoDB } = require('./config/mongodb')
const { getRedisClient } = require('./config/redis')
const { startCronJobs } = require('./utils/cron')
const config = require('./config')
const logger = require('./utils/logger')

const PORT = config.port

async function start() {
  logger.info('Starting LinkPulse API server...', {
    env: config.env,
    port: PORT,
    pid: process.pid,
  })

  // 1. Connect to MongoDB
  await connectMongoDB()

  // 2. Initialize Redis client (connection is lazy but we trigger it early)
  const redis = getRedisClient()
  redis.on('ready', () => logger.info('Redis ready'))

  // 3. Start cron jobs
  startCronJobs()

  // 4. Start HTTP server
  httpServer.listen(PORT, () => {
    logger.info(`LinkPulse API listening on port ${PORT}`, {
      url: `http://localhost:${PORT}`,
      env: config.env,
    })
  })

  // ─── Graceful shutdown ───────────────────────────────────────────────────
  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`)

    httpServer.close(async () => {
      try {
        const mongoose = require('mongoose')
        await mongoose.connection.close()
        logger.info('MongoDB connection closed')

        const { closeRedis } = require('./config/redis')
        await closeRedis()
        logger.info('Redis connection closed')

        const { closeAllQueues } = require('./config/bull')
        await closeAllQueues()
        logger.info('Bull queues closed')

        logger.info('Graceful shutdown complete')
        process.exit(0)
      } catch (err) {
        logger.error('Error during shutdown', { error: err.message })
        process.exit(1)
      }
    })

    // Force exit after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
      process.exit(1)
    }, 30000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack })
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) })
  })
}

start().catch(err => {
  logger.error('Failed to start server', { error: err.message })
  process.exit(1)
})
