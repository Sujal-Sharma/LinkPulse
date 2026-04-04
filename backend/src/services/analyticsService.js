const mongoose = require('mongoose')
const ClickEvent = require('../models/ClickEvent')
const Link = require('../models/Link')
const cacheService = require('./cacheService')
const logger = require('../utils/logger')

/**
 * Get time-series click data for a link grouped by day.
 */
async function getClickTimeSeries(linkId, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const pipeline = [
    {
      $match: {
        linkId: new mongoose.Types.ObjectId(linkId),
        clickedAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' },
        },
        clicks: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', clicks: 1, _id: 0 } },
  ]

  return ClickEvent.aggregate(pipeline)
}

/**
 * Get top cities for a link.
 */
async function getTopCities(linkId, limit = 10) {
  const pipeline = [
    { $match: { linkId: new mongoose.Types.ObjectId(linkId), city: { $ne: 'Unknown' } } },
    {
      $group: {
        _id: { city: '$city', region: '$region', countryCode: '$countryCode' },
        clicks: { $sum: 1 },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: limit },
    {
      $project: {
        city: '$_id.city',
        region: '$_id.region',
        countryCode: '$_id.countryCode',
        clicks: 1,
        _id: 0,
      },
    },
  ]

  return ClickEvent.aggregate(pipeline)
}

/**
 * Get top countries for a link.
 */
async function getTopCountries(linkId, limit = 10) {
  const pipeline = [
    { $match: { linkId: new mongoose.Types.ObjectId(linkId) } },
    {
      $group: {
        _id: { country: '$country', countryCode: '$countryCode' },
        clicks: { $sum: 1 },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: limit },
    {
      $project: {
        country: '$_id.country',
        countryCode: '$_id.countryCode',
        clicks: 1,
        _id: 0,
      },
    },
  ]

  return ClickEvent.aggregate(pipeline)
}

/**
 * Get device breakdown for a link.
 */
async function getDeviceBreakdown(linkId) {
  const pipeline = [
    { $match: { linkId: new mongoose.Types.ObjectId(linkId) } },
    {
      $group: {
        _id: '$device',
        clicks: { $sum: 1 },
      },
    },
    { $sort: { clicks: -1 } },
    { $project: { device: '$_id', clicks: 1, _id: 0 } },
  ]

  return ClickEvent.aggregate(pipeline)
}

/**
 * Get browser breakdown for a link.
 */
async function getBrowserBreakdown(linkId) {
  const pipeline = [
    { $match: { linkId: new mongoose.Types.ObjectId(linkId) } },
    {
      $group: {
        _id: '$browser',
        clicks: { $sum: 1 },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: 10 },
    { $project: { browser: '$_id', clicks: 1, _id: 0 } },
  ]

  return ClickEvent.aggregate(pipeline)
}

/**
 * Get referrer breakdown for a link.
 */
async function getReferrerBreakdown(linkId, limit = 10) {
  const pipeline = [
    { $match: { linkId: new mongoose.Types.ObjectId(linkId) } },
    {
      $group: {
        _id: '$referrerDomain',
        clicks: { $sum: 1 },
      },
    },
    { $sort: { clicks: -1 } },
    { $limit: limit },
    { $project: { referrerDomain: '$_id', clicks: 1, _id: 0 } },
  ]

  return ClickEvent.aggregate(pipeline)
}

/**
 * Get hourly heatmap (day-of-week × hour grid).
 */
async function getHourlyHeatmap(linkId, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const pipeline = [
    {
      $match: {
        linkId: new mongoose.Types.ObjectId(linkId),
        clickedAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          dayOfWeek: { $dayOfWeek: '$clickedAt' }, // 1=Sun..7=Sat
          hour: { $hour: '$clickedAt' },
        },
        clicks: { $sum: 1 },
      },
    },
    {
      $project: {
        day: '$_id.dayOfWeek',
        hour: '$_id.hour',
        clicks: 1,
        _id: 0,
      },
    },
  ]

  return ClickEvent.aggregate(pipeline)
}

/**
 * Get full analytics summary combining Redis + MongoDB.
 */
async function getAnalyticsSummary(link) {
  const shortCode = link.shortCode
  const linkId = link._id.toString()

  // Redis counters (fast)
  const redisStats = await cacheService.getClickStats(shortCode)

  // MongoDB totals from the link document
  const mongoStats = link.analytics || {}

  return {
    totalClicks: mongoStats.totalClicks || 0,
    uniqueClicks: mongoStats.uniqueClicks || 0,
    clicksToday: redisStats.today || mongoStats.clicksToday || 0,
    clicksThisHour: redisStats.thisHour || 0,
    lastClickAt: mongoStats.lastClickAt || null,
  }
}

/**
 * Get overall stats for all links owned by a user.
 */
async function getUserStats(userId) {
  const result = await Link.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalLinks: { $sum: 1 },
        activeLinks: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalClicks: { $sum: '$analytics.totalClicks' },
        clicksToday: { $sum: '$analytics.clicksToday' },
      },
    },
  ])

  return result[0] || {
    totalLinks: 0,
    activeLinks: 0,
    totalClicks: 0,
    clicksToday: 0,
  }
}

module.exports = {
  getClickTimeSeries,
  getTopCities,
  getTopCountries,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getReferrerBreakdown,
  getHourlyHeatmap,
  getAnalyticsSummary,
  getUserStats,
}
