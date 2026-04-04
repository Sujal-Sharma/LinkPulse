require('dotenv').config()

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8000,

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/linkpulse',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    tls: (process.env.REDIS_URL || '').startsWith('rediss://') ? {} : undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production-32chars',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-prod',
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },

  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret-change-in-prod',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    baseUrl: process.env.BASE_URL || 'http://localhost:8000',
  },

  email: {
    from: process.env.EMAIL_FROM || 'LinkPulse <onboarding@resend.dev>',
  },

  cron: {
    secret: process.env.CRON_SECRET || 'cron-secret',
  },

  rateLimit: {
    redirect: { capacity: 60, refillRate: 60 / 360 },    // 60/6min window
    api: { capacity: 100, refillRate: 100 / 300 },         // 100/5min window
    linkCreate: {
      free: { capacity: 10, refillRate: 10 / 86400 },
      pro: { capacity: 50, refillRate: 50 / 86400 },
      team: { capacity: 200, refillRate: 200 / 86400 },
    }
  },

  bloom: {
    size: 1000000,
    numHashFunctions: 3,
    redisKey: 'bloom:shortcodes',
  }
}

module.exports = config
