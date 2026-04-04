const express = require('express')
const router = express.Router()

const authRoutes = require('./auth')
const linkRoutes = require('./links')
const analyticsRoutes = require('./analytics')
const workspaceRoutes = require('./workspace')

router.use('/auth', authRoutes)
router.use('/links', linkRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/workspaces', workspaceRoutes)

module.exports = router
