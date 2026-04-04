const { createQueue } = require('../config/bull')
const logger = require('../utils/logger')

const expiryQueue = createQueue('expiry')

expiryQueue.on('completed', (job) => {
  logger.info('Expiry job completed', { jobId: job.id, shortCode: job.data.shortCode })
})

expiryQueue.on('failed', (job, err) => {
  logger.error('Expiry job failed', {
    jobId: job.id,
    shortCode: job.data.shortCode,
    error: err.message,
  })
})

module.exports = expiryQueue
