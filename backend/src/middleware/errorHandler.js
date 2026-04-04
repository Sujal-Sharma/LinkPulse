const logger = require('../utils/logger')

/**
 * 404 handler — must be registered AFTER all routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  })
}

/**
 * Global error handler — must have 4 parameters for Express to recognize it.
 */
function errorHandler(err, req, res, next) {  // eslint-disable-line no-unused-vars
  // CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message })
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }))
    return res.status(400).json({ error: 'Validation failed', errors })
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field'
    return res.status(409).json({
      error: 'Duplicate value',
      message: `${field} already exists`,
    })
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: `Invalid value for field: ${err.path}`,
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
  }

  // Business logic errors with explicit status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
    })
  }

  // Log unexpected errors
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  })

  const statusCode = err.status || 500
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}

module.exports = { notFoundHandler, errorHandler }
