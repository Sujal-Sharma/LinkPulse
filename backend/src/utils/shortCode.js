const { customAlphabet } = require('nanoid')

// URL-safe alphabet without ambiguous chars (0, O, I, l)
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'
const nanoid = customAlphabet(ALPHABET, 6)

/**
 * Generate a unique short code (6 chars by default)
 */
function generateShortCode(length = 6) {
  return nanoid(length)
}

/**
 * Validate a short code format
 */
function isValidShortCode(code) {
  if (!code || typeof code !== 'string') return false
  if (code.length < 4 || code.length > 20) return false
  // Only URL-safe characters
  return /^[a-zA-Z0-9_-]+$/.test(code)
}

/**
 * Sanitize a custom code provided by user
 */
function sanitizeCustomCode(code) {
  return code.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 20)
}

module.exports = { generateShortCode, isValidShortCode, sanitizeCustomCode }
