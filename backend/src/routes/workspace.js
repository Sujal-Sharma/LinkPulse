const express = require('express')
const router = express.Router()
const Workspace = require('../models/Workspace')
const User = require('../models/User')
const { authenticate } = require('../middleware/auth')
const { validate, createWorkspaceSchema, inviteMemberSchema } = require('../middleware/validate')
const { apiRateLimiter } = require('../middleware/rateLimiter')
const logger = require('../utils/logger')

router.use(authenticate)
router.use(apiRateLimiter)

/**
 * Helper — generate a unique slug from workspace name.
 */
async function generateSlug(name) {
  let base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 35)
  let slug = base
  let counter = 1
  while (await Workspace.findOne({ slug }).lean()) {
    slug = `${base}-${counter++}`
  }
  return slug
}

// GET /workspaces — list user's workspaces
router.get('/', async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { ownerId: req.user.userId },
        { 'members.userId': req.user.userId },
      ],
    })
      .populate('ownerId', 'name email')
      .populate('members.userId', 'name email')
      .lean()

    res.json({ workspaces })
  } catch (err) {
    next(err)
  }
})

// POST /workspaces — create workspace
router.post('/', validate(createWorkspaceSchema), async (req, res, next) => {
  try {
    const { name, slug: customSlug } = req.body
    const slug = customSlug || await generateSlug(name)

    const workspace = await Workspace.create({
      name,
      slug,
      ownerId: req.user.userId,
      members: [{ userId: req.user.userId, role: 'admin' }],
    })

    // Add to user's workspace list
    await User.updateOne(
      { _id: req.user.userId },
      { $addToSet: { workspaces: workspace._id } }
    )

    logger.info('Workspace created', { workspaceId: workspace._id, slug })
    res.status(201).json({ workspace })
  } catch (err) {
    next(err)
  }
})

// GET /workspaces/:id — get workspace details
router.get('/:id', async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('members.userId', 'name email')
      .lean()

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' })

    // Check membership
    const isMember = workspace.ownerId._id.toString() === req.user.userId ||
      workspace.members.some(m => m.userId?._id?.toString() === req.user.userId)

    if (!isMember) return res.status(403).json({ error: 'Not a member of this workspace' })

    res.json({ workspace })
  } catch (err) {
    next(err)
  }
})

// POST /workspaces/:id/invite — invite a member
router.post('/:id/invite', validate(inviteMemberSchema), async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' })

    // Only owner or admin can invite
    const callerMember = workspace.members.find(
      m => m.userId.toString() === req.user.userId
    )
    const isOwner = workspace.ownerId.toString() === req.user.userId
    if (!isOwner && callerMember?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite members' })
    }

    const { email, role } = req.body
    const user = await User.findOne({ email }).lean()
    if (!user) return res.status(404).json({ error: 'User with that email not found' })

    // Don't add duplicate
    const alreadyMember = workspace.members.some(
      m => m.userId.toString() === user._id.toString()
    )
    if (alreadyMember) return res.status(409).json({ error: 'User is already a member' })

    workspace.members.push({ userId: user._id, role })
    await workspace.save()

    await User.updateOne(
      { _id: user._id },
      { $addToSet: { workspaces: workspace._id } }
    )

    logger.info('Member invited to workspace', {
      workspaceId: workspace._id,
      userId: user._id,
      role,
    })

    res.json({ message: 'Member invited', workspace })
  } catch (err) {
    next(err)
  }
})

// DELETE /workspaces/:id/members/:userId — remove a member
router.delete('/:id/members/:memberId', async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' })

    const isOwner = workspace.ownerId.toString() === req.user.userId
    if (!isOwner) return res.status(403).json({ error: 'Only the owner can remove members' })

    workspace.members = workspace.members.filter(
      m => m.userId.toString() !== req.params.memberId
    )
    await workspace.save()

    res.json({ message: 'Member removed', workspace })
  } catch (err) {
    next(err)
  }
})

// DELETE /workspaces/:id — delete workspace
router.delete('/:id', async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' })

    if (workspace.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the owner can delete a workspace' })
    }

    await Workspace.deleteOne({ _id: req.params.id })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
