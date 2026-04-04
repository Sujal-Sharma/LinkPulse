/**
 * In-memory metrics store — no external service required.
 * Tracks counters, histograms, and derived rates.
 */

const counters = {
  'redirects.total': 0,
  'redirects.cacheHit': 0,
  'redirects.cacheMiss': 0,
  'redirects.rateLimited': 0,
  'redirects.notFound': 0,
  'queue.jobsProcessed': 0,
  'queue.jobsFailed': 0,
  'links.created': 0,
  'links.expired': 0,
}

// Circular buffer for last 1000 redirect latencies
const MAX_LATENCIES = 1000
const latencies = []
let latencyIndex = 0

// RPM tracking — timestamps of requests in last 60s
const rpmWindow = []

function increment(key, amount = 1) {
  if (counters[key] !== undefined) {
    counters[key] += amount
  }
}

function recordLatency(ms) {
  if (latencies.length < MAX_LATENCIES) {
    latencies.push(ms)
  } else {
    latencies[latencyIndex % MAX_LATENCIES] = ms
    latencyIndex++
  }

  // Track for RPM
  const now = Date.now()
  rpmWindow.push(now)
}

function percentile(arr, p) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function calculateRPM() {
  const now = Date.now()
  const cutoff = now - 60000
  // Remove old entries
  while (rpmWindow.length > 0 && rpmWindow[0] < cutoff) {
    rpmWindow.shift()
  }
  return rpmWindow.length
}

async function getMetrics(analyticsQueue) {
  const total = counters['redirects.total']
  const hits = counters['redirects.cacheHit']
  const cacheHitRate = total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0%'

  let queueBacklog = 0
  try {
    if (analyticsQueue) {
      queueBacklog = await analyticsQueue.getWaitingCount()
    }
  } catch (_) {}

  const { getRedisClient } = require('../config/redis')
  const mongoose = require('mongoose')
  let redisConnected = false
  try {
    redisConnected = getRedisClient().status === 'ready'
  } catch (_) {}

  return {
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    counters,
    cacheHitRate,
    avgLatencyMs: percentile(latencies, 50),
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    p99LatencyMs: percentile(latencies, 99),
    redirectsPerMinute: calculateRPM(),
    queueBacklog,
    redisConnected,
    mongoConnected: mongoose.connection.readyState === 1,
    latencySamples: latencies.length,
    timestamp: new Date().toISOString(),
  }
}

module.exports = { increment, recordLatency, getMetrics, counters }
