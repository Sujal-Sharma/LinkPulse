const mongoose = require('mongoose')

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  createdAt: { type: Date, default: Date.now },
})

WorkspaceSchema.index({ ownerId: 1 })

module.exports = mongoose.model('Workspace', WorkspaceSchema)
