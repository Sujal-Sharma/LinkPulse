const geoip = require('geoip-lite')
const logger = require('../utils/logger')

/**
 * Country code → flag emoji
 */
function countryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🌐'
  const codePoints = [...countryCode.toUpperCase()].map(
    c => 0x1F1E6 + c.charCodeAt(0) - 65
  )
  return String.fromCodePoint(...codePoints)
}

/**
 * Lookup geo data from an IP address.
 * Returns normalized geo object.
 */
function lookupGeo(ip) {
  if (!ip) return defaultGeo()

  // Strip IPv6 prefix for IPv4-mapped addresses
  const cleanIp = ip.replace(/^::ffff:/, '')

  try {
    const geo = geoip.lookup(cleanIp)
    if (!geo) return defaultGeo()

    return {
      country: geo.country || 'Unknown',
      countryCode: geo.country || 'XX',
      city: geo.city || 'Unknown',
      region: geo.region || 'Unknown',
      latitude: geo.ll ? geo.ll[0] : 0,
      longitude: geo.ll ? geo.ll[1] : 0,
      timezone: geo.timezone || 'UTC',
      flag: countryFlag(geo.country),
    }
  } catch (err) {
    logger.warn('GeoIP lookup failed', { ip: cleanIp, error: err.message })
    return defaultGeo()
  }
}

function defaultGeo() {
  return {
    country: 'Unknown',
    countryCode: 'XX',
    city: 'Unknown',
    region: 'Unknown',
    latitude: 0,
    longitude: 0,
    timezone: 'UTC',
    flag: '🌐',
  }
}

module.exports = { lookupGeo, countryFlag }
