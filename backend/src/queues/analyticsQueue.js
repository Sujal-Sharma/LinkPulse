const { createQueue } = require('../config/bull')
const logger = require('../utils/logger')

const analyticsQueue = createQueue('analytics')

analyticsQueue.on('completed', (job) => {
  logger.info('Analytics job completed', {
    jobId: job.id,
    name: job.name,
    attempts: job.attemptsMade,
  })
})

analyticsQueue.on('failed', (job, err) => {
  logger.error('Analytics job failed', {
    jobId: job.id,
    name: job.name,
    attempts: job.attemptsMade,
    error: err.message,
  })
})

module.exports = analyticsQueue
