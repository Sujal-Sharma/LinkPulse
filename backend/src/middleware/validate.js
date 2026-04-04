const { z } = require('zod')

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(60).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
})

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
})

const createLinkSchema = z.object({
  originalUrl: z.string().url('Must be a valid URL').max(2048),
  customCode: z.string().min(4).max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  title: z.string().max(100).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(4).max(50).optional(),
  maxClicksPerDay: z.number().int().positive().optional(),
  workspaceId: z.string().optional(),
  abTest: z.object({
    enabled: z.boolean(),
    variantA: z.object({
      url: z.string().url(),
      weight: z.number().min(0).max(100).default(50),
    }),
    variantB: z.object({
      url: z.string().url(),
      weight: z.number().min(0).max(100).default(50),
    }),
  }).optional(),
})

const updateLinkSchema = z.object({
  title: z.string().max(100).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxClicksPerDay: z.number().int().positive().nullable().optional(),
  abTest: z.object({
    enabled: z.boolean(),
    variantA: z.object({ url: z.string().url(), weight: z.number() }),
    variantB: z.object({ url: z.string().url(), weight: z.number() }),
  }).optional(),
})

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(60).trim(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/).optional(),
})

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
})

const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
  limit: z.string().regex(/^\d+$/).optional(),
})

// ─── MIDDLEWARE FACTORY ───────────────────────────────────────────────────────

/**
 * Returns Express middleware that validates req.body against a Zod schema.
 * Responds 400 with field errors on failure.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body
    const result = schema.safeParse(data)

    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return res.status(400).json({ error: 'Validation failed', errors })
    }

    // Replace with parsed + transformed data
    if (source === 'query') {
      req.query = result.data
    } else {
      req.body = result.data
    }

    next()
  }
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createLinkSchema,
  updateLinkSchema,
  createWorkspaceSchema,
  inviteMemberSchema,
  analyticsQuerySchema,
}
