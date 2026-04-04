const helmet = require('helmet')
const cors = require('cors')
const mongoSanitize = require('express-mongo-sanitize')
const hpp = require('hpp')
const express = require('express')
const config = require('../config')

/**
 * Apply all security middleware to an Express app in the correct order.
 */
function applySecurityMiddleware(app) {
  // 1. Helmet — security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false, // Allow embedding for analytics
    })
  )

  // 2. CORS
  const allowedOrigins = [
    config.app.frontendUrl,
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean)

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow no-origin requests (mobile apps, curl, etc.)
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error(`CORS: ${origin} not allowed`))
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400,
    })
  )

  // 3. Body parsing (with size limit)
  app.use(express.json({ limit: '10kb' }))
  app.use(express.urlencoded({ extended: true, limit: '10kb' }))

  // 4. NoSQL injection prevention
  app.use(mongoSanitize({ replaceWith: '_' }))

  // 5. HTTP Parameter Pollution prevention
  app.use(hpp())
}

module.exports = { applySecurityMiddleware }
