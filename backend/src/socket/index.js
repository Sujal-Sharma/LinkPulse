const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const config = require('../config')
const logger = require('../utils/logger')
const handlers = require('./handlers')

let io = null

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [config.app.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token

    if (!token) {
      // Allow unauthenticated connections for public analytics
      socket.userId = null
      return next()
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret)
      socket.userId = decoded.userId
      next()
    } catch (err) {
      logger.warn('Socket auth failed', { error: err.message })
      // Don't reject — allow but without userId
      socket.userId = null
      next()
    }
  })

  io.on('connection', (socket) => {
    logger.info('Socket connected', {
      socketId: socket.id,
      userId: socket.userId || 'anonymous',
    })

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`)
    }

    // Subscribe to link analytics room
    socket.on('subscribe:link', (shortCode) => {
      if (!shortCode || typeof shortCode !== 'string') return
      const sanitized = shortCode.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)
      socket.join(`analytics:${sanitized}`)
      logger.info('Socket subscribed to link', { socketId: socket.id, shortCode: sanitized })
    })

    socket.on('unsubscribe:link', (shortCode) => {
      if (!shortCode) return
      const sanitized = shortCode.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)
      socket.leave(`analytics:${sanitized}`)
    })

    handlers.registerHandlers(socket, io)

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId: socket.userId || 'anonymous',
        reason,
      })
    })

    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, error: err.message })
    })
  })

  logger.info('Socket.io initialized')
  return io
}

function getIO() {
  return io
}

/**
 * Emit an event to all subscribers of a specific link's analytics room.
 */
function emitToLink(shortCode, event, data) {
  if (!io) return
  io.to(`analytics:${shortCode}`).emit(event, data)
}

/**
 * Emit an event to a specific user's personal room.
 */
function emitToUser(userId, event, data) {
  if (!io || !userId) return
  io.to(`user:${userId}`).emit(event, data)
}

/**
 * Broadcast to all connected clients.
 */
function broadcast(event, data) {
  if (!io) return
  io.emit(event, data)
}

module.exports = { initSocket, getIO, emitToLink, emitToUser, broadcast }
