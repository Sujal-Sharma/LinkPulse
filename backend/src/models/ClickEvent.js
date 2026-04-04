const mongoose = require('mongoose')

const ClickEventSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link',
    required: true,
    index: true,
  },
  shortCode: { type: String, required: true, index: true },

  // Timing
  clickedAt: { type: Date, default: Date.now },

  // Geographic
  ip: { type: String, default: null },
  country: { type: String, default: 'Unknown' },
  countryCode: { type: String, default: 'XX' },
  city: { type: String, default: 'Unknown' },
  region: { type: String, default: 'Unknown' },
  latitude: { type: Number, default: 0 },
  longitude: { type: Number, default: 0 },

  // Device info
  userAgent: { type: String, default: '' },
  browser: { type: String, default: 'Unknown' },
  browserVersion: { type: String, default: '' },
  os: { type: String, default: 'Unknown' },
  device: { type: String, default: 'desktop' },

  // Traffic source
  referrer: { type: String, default: 'direct' },
  referrerDomain: { type: String, default: 'direct' },

  // A/B test variant
  variant: { type: String, enum: ['A', 'B', null], default: null },
})

// TTL index: auto-delete click events after 90 days
ClickEventSchema.index(
  { clickedAt: 1 },
  { expireAfterSeconds: 7776000 }
)

// Compound indexes for analytics queries
ClickEventSchema.index({ linkId: 1, clickedAt: -1 })
ClickEventSchema.index({ linkId: 1, country: 1 })
ClickEventSchema.index({ linkId: 1, device: 1 })
ClickEventSchema.index({ shortCode: 1, clickedAt: -1 })

module.exports = mongoose.model('ClickEvent', ClickEventSchema)
