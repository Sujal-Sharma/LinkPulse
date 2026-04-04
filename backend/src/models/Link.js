const mongoose = require('mongoose')

const LinkSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    minlength: 4,
    maxlength: 20,
  },
  originalUrl: {
    type: String,
    required: true,
    maxlength: 2048,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null,
  },
  title: { type: String, default: '' },
  tags: [String],

  isActive: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, default: null },

  // A/B Testing
  abTest: {
    enabled: { type: Boolean, default: false },
    variantA: {
      url: { type: String, default: '' },
      weight: { type: Number, default: 50 },
    },
    variantB: {
      url: { type: String, default: '' },
      weight: { type: Number, default: 50 },
    },
  },

  // Password protection
  password: { type: String, default: null },

  // Analytics summary (updated by worker)
  analytics: {
    totalClicks: { type: Number, default: 0 },
    uniqueClicks: { type: Number, default: 0 },
    lastClickAt: { type: Date, default: null },
    clicksToday: { type: Number, default: 0 },
    clicksThisWeek: { type: Number, default: 0 },
    clicksThisMonth: { type: Number, default: 0 },
  },

  // Per-link rate limiting
  maxClicksPerDay: { type: Number, default: null },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
})

// Compound indexes for performance
LinkSchema.index({ userId: 1, createdAt: -1 })
LinkSchema.index({ shortCode: 1, isActive: 1 })
LinkSchema.index({ expiresAt: 1 }, { sparse: true })

// Update updatedAt on save
LinkSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('Link', LinkSchema)
