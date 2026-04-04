const { createQueue } = require('../config/bull')
const logger = require('../utils/logger')

const emailQueue = createQueue('email')

emailQueue.on('completed', (job) => {
  logger.info('Email job completed', { jobId: job.id, name: job.name })
})

emailQueue.on('failed', (job, err) => {
  logger.error('Email job failed', {
    jobId: job.id,
    name: job.name,
    error: err.message,
  })
})

module.exports = emailQueue
