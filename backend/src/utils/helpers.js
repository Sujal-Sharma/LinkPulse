/**
 * Utility helpers used across the backend
 */

/**
 * Returns ISO date string key: "2024-08-01"
 */
function getDateKey(date = new Date()) {
  return date.toISOString().split('T')[0]
}

/**
 * Returns hour key: "2024-08-01:14"
 */
function getHourKey(date = new Date()) {
  return `${date.toISOString().split('T')[0]}:${date.getHours()}`
}

/**
 * Extract domain from a URL string. Returns 'direct' on failure.
 */
function extractDomain(url) {
  try {
    if (!url || url === 'direct') return 'direct'
    return new URL(url).hostname.replace(/^www\./, '')
  } catch (_) {
    return 'direct'
  }
}

/**
 * Anonymize IP for GDPR: mask last octet for IPv4, last 80 bits for IPv6
 */
function anonymizeIp(ip) {
  if (!ip) return null

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.')
    parts[parts.length - 1] = '0'
    return parts.join('.')
  }

  // IPv6 — zero out last 80 bits (last 5 groups)
  const parts = ip.split(':')
  if (parts.length >= 5) {
    return parts.slice(0, 3).join(':') + ':0:0:0:0:0'
  }
  return ip
}

/**
 * Paginate mongoose query results
 */
function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page, 10))
  const l = Math.min(100, Math.max(1, parseInt(limit, 10)))
  return { skip: (p - 1) * l, limit: l, page: p }
}

/**
 * Sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Safe JSON parse — returns null on failure
 */
function safeJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch (_) {
    return null
  }
}

module.exports = { getDateKey, getHourKey, extractDomain, anonymizeIp, paginate, sleep, safeJsonParse }
