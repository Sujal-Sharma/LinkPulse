const jwt = require('jsonwebtoken')
const config = require('../config')
const cacheService = require('../services/cacheService')
const User = require('../models/User')
const logger = require('../utils/logger')

/**
 * Verify JWT access token from Authorization header.
 * Attaches req.user to the request on success.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.slice(7)

    // Check blacklist
    const blacklisted = await cacheService.isTokenBlacklisted(token)
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' })
    }

    const decoded = jwt.verify(token, config.jwt.secret)
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't block.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  try {
    const token = authHeader.slice(7)
    const decoded = jwt.verify(token, config.jwt.secret)
    req.user = decoded
  } catch (_) {}

  next()
}

/**
 * Require specific role within a workspace.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

/**
 * Generate access + refresh token pair.
 */
function generateTokens(user) {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    plan: user.plan,
  }

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiry,
  })

  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  )

  return { accessToken, refreshToken }
}

/**
 * Verify a refresh token.
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret)
}

module.exports = { authenticate, optionalAuth, requireRole, generateTokens, verifyRefreshToken }
