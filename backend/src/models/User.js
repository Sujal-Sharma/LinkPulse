const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: { type: String, default: null },
  googleId: { type: String, default: null, index: true },
  avatar: { type: String, default: null },

  plan: {
    type: String,
    enum: ['free', 'pro', 'team'],
    default: 'free',
  },

  limits: {
    linksPerDay: { type: Number, default: 50 },
    clicksPerLink: { type: Number, default: 100000 },
    analyticsRetention: { type: Number, default: 30 },
  },

  workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }],

  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },

  lastLoginAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
})

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare password
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

// Remove sensitive fields from JSON output
UserSchema.methods.toJSON = function () {
  const user = this.toObject()
  delete user.password
  delete user.emailVerificationToken
  delete user.passwordResetToken
  delete user.passwordResetExpires
  return user
}

module.exports = mongoose.model('User', UserSchema)
