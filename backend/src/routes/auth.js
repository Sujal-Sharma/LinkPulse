const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Strategy: GoogleStrategy } = require('passport-google-oauth20')
const User = require('../models/User')
const { authenticate, generateTokens, verifyRefreshToken } = require('../middleware/auth')
const { validate, registerSchema, loginSchema } = require('../middleware/validate')
const cacheService = require('../services/cacheService')
const emailQueue = require('../queues/emailQueue')
const config = require('../config')
const logger = require('../utils/logger')

// ─── PASSPORT GOOGLE STRATEGY ────────────────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value
      if (!email) return done(new Error('No email from Google'))

      let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] })

      if (user) {
        // Link Google ID if signing in via Google for the first time on existing account
        if (!user.googleId) {
          user.googleId = profile.id
          user.avatar = profile.photos?.[0]?.value || null
          await user.save()
        }
      } else {
        // New user — create account
        user = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value || null,
        })
        await emailQueue.add('welcomeEmail', { to: email, name: user.name }, { attempts: 2 })
      }

      user.lastLoginAt = new Date()
      await user.save()

      return done(null, user)
    } catch (err) {
      return done(err)
    }
  }
))

router.use(passport.initialize())

// POST /auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    const existing = await User.findOne({ email }).lean()
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const user = await User.create({ name, email, password })

    const { accessToken, refreshToken } = generateTokens(user)

    // Store refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: config.cookie.maxAge,
    })

    // Queue welcome email
    await emailQueue.add('welcomeEmail', { to: user.email, name: user.name }, { attempts: 2 })

    logger.info('User registered', { userId: user._id, email })

    res.status(201).json({
      user: user.toJSON(),
      accessToken,
    })
  } catch (err) {
    next(err)
  }
})

// POST /auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await user.comparePassword(password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    user.lastLoginAt = new Date()
    await user.save()

    const { accessToken, refreshToken } = generateTokens(user)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: config.cookie.maxAge,
    })

    logger.info('User logged in', { userId: user._id })

    res.json({
      user: user.toJSON(),
      accessToken,
    })
  } catch (err) {
    next(err)
  }
})

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return res.status(401).json({ error: 'No refresh token' })

    // Check blacklist
    const blacklisted = await cacheService.isTokenBlacklisted(token)
    if (blacklisted) return res.status(401).json({ error: 'Token revoked' })

    const decoded = verifyRefreshToken(token)
    const user = await User.findById(decoded.userId)
    if (!user) return res.status(401).json({ error: 'User not found' })

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user)

    // Blacklist old refresh token (rotate)
    await cacheService.blacklistToken(token, 7 * 24 * 3600)

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: config.cookie.maxAge,
    })

    res.json({ accessToken })
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }
    next(err)
  }
})

// POST /auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (token) {
      await cacheService.blacklistToken(token, 7 * 24 * 3600)
    }

    // Blacklist access token (until expiry, ~15min)
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      await cacheService.blacklistToken(authHeader.slice(7), 15 * 60)
    }

    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
})

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { password, emailVerificationToken, passwordResetToken, passwordResetExpires, ...safeUser } = user
    res.json({ user: safeUser })
  } catch (err) {
    next(err)
  }
})

// PATCH /auth/profile — update name
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' })

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name: name.trim() },
      { new: true }
    )
    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({ user: user.toJSON() })
  } catch (err) {
    next(err)
  }
})

// PATCH /auth/password — change password
router.patch('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }

    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Google users may have no password
    if (user.password) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required' })
      const valid = await user.comparePassword(currentPassword)
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    }

    user.password = newPassword
    await user.save()

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    next(err)
  }
})

// GET /auth/google — redirect to Google consent screen
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

// GET /auth/google/callback — Google redirects here after consent
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
  async (req, res) => {
    try {
      const user = req.user
      const { accessToken, refreshToken } = generateTokens(user)

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        maxAge: config.cookie.maxAge,
      })

      // Redirect to frontend with access token in query param
      // Frontend reads it, stores in memory, then removes from URL
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`)
    } catch (err) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`)
    }
  }
)

module.exports = router
