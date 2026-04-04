const cacheService = require('../services/cacheService')
const logger = require('../utils/logger')

/**
 * Register all socket event handlers for a connected socket.
 */
function registerHandlers(socket, io) {
  // Client requests recent clicks for a link (on subscribe)
  socket.on('get:recent-clicks', async ({ shortCode, count = 10 }) => {
    if (!shortCode) return

    try {
      const sanitized = shortCode.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)
      const events = await cacheService.getRecentClicks(sanitized, count)
      socket.emit('recent-clicks', { shortCode: sanitized, events })
    } catch (err) {
      logger.error('Socket get:recent-clicks error', { error: err.message })
    }
  })

  // Client requests live stats for a link
  socket.on('get:stats', async ({ shortCode }) => {
    if (!shortCode) return

    try {
      const sanitized = shortCode.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)
      const stats = await cacheService.getClickStats(sanitized)
      socket.emit('stats:update', { shortCode: sanitized, ...stats })
    } catch (err) {
      logger.error('Socket get:stats error', { error: err.message })
    }
  })

  // Client requests top countries
  socket.on('get:geo', async ({ shortCode, limit = 10 }) => {
    if (!shortCode) return

    try {
      const sanitized = shortCode.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)
      const countries = await cacheService.getTopCountries(sanitized, limit)
      socket.emit('geo:update', { shortCode: sanitized, countries })
    } catch (err) {
      logger.error('Socket get:geo error', { error: err.message })
    }
  })
}

module.exports = { registerHandlers }
