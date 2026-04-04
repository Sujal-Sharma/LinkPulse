require('dotenv').config()

const express = require('express')
const http = require('http')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

const config = require('./config')
const { applySecurityMiddleware } = require('./middleware/security')
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler')
const { apiRateLimiter } = require('./middleware/rateLimiter')
const apiRoutes = require('./routes/index')
const redirectRouter = require('./routes/redirect')
const { initSocket } = require('./socket')
const { getMetrics } = require('./utils/metrics')
const logger = require('./utils/logger')

// ─── Workers (register Bull processors) ─────────────────────────────────────
require('./queues/workers/analyticsWorker')
require('./queues/workers/expiryWorker')
require('./queues/workers/emailWorker')

const app = express()
const httpServer = http.createServer(app)

// ─── Security middleware ─────────────────────────────────────────────────────
applySecurityMiddleware(app)

// ─── Cookie parser ───────────────────────────────────────────────────────────
app.use(cookieParser(config.cookie.secret))

// ─── HTTP request logging (Morgan) ───────────────────────────────────────────
const morganFormat = ':method :url :status :response-time ms - :res[content-length]'
app.use(
  morgan(morganFormat, {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => {
      // Skip health checks, metrics, and redirect logs (Winston handles those)
      return (
        req.path === '/health' ||
        req.path === '/metrics' ||
        req.path.startsWith('/r/')
      )
    },
  })
)

// ─── Health check (no auth, no logging) ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// ─── Metrics endpoint ─────────────────────────────────────────────────────────
app.get('/metrics', async (req, res, next) => {
  try {
    const analyticsQueue = require('./queues/analyticsQueue')
    const m = await getMetrics(analyticsQueue)
    res.json(m)
  } catch (err) {
    next(err)
  }
})

// ─── Redirect route (most critical path) ─────────────────────────────────────
// Mounted at /r/:code — kept separate from API routes for clarity
app.use('/r', redirectRouter)

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes)

// ─── 404 + error handlers ────────────────────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

// ─── Socket.io ───────────────────────────────────────────────────────────────
initSocket(httpServer)

module.exports = { app, httpServer }
