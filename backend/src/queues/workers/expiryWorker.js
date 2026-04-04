const expiryQueue = require('../expiryQueue')
const emailQueue = require('../emailQueue')
const Link = require('../../models/Link')
const cacheService = require('../../services/cacheService')
const logger = require('../../utils/logger')
const metrics = require('../../utils/metrics')

let socketService = null
function getSocket() {
  if (!socketService) {
    try { socketService = require('../../socket') } catch (_) {}
  }
  return socketService
}

expiryQueue.process('expireLink', 3, async (job) => {
  const { shortCode, linkId } = job.data

  // Mark link inactive in MongoDB
  await Link.updateOne(
    { _id: linkId },
    { isActive: false, updatedAt: new Date() }
  )

  // Remove from Redis cache
  await cacheService.invalidateUrl(shortCode)

  // Notify user via email
  const link = await Link.findById(linkId)
    .populate('userId', 'email name')
    .lean()

  if (link?.userId?.email) {
    await emailQueue.add(
      'linkExpired',
      {
        to: link.userId.email,
        name: link.userId.name,
        shortCode,
        originalUrl: link.originalUrl,
        totalClicks: link.analytics?.totalClicks || 0,
      },
      { attempts: 2 }
    )
  }

  // Notify via Socket.io
  const socket = getSocket()
  if (socket?.emitToUser) {
    socket.emitToUser(link?.userId?._id?.toString(), 'link:expired', { shortCode })
  }

  metrics.increment('links.expired')
  logger.info('Link expired', { shortCode, linkId })
})

module.exports = expiryQueue
