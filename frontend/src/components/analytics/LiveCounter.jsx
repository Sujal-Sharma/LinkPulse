import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLinkAnalytics } from '../../hooks/useSocket'

export default function LiveCounter({ shortCode, initialTotal = 0 }) {
  const [total, setTotal] = useState(initialTotal)
  const [recentClicks, setRecentClicks] = useState([])
  const [flash, setFlash] = useState(false)

  const onClickNew = useCallback((data) => {
    setTotal(t => t + 1)
    setRecentClicks(prev => [data, ...prev].slice(0, 20))
    setFlash(true)
    setTimeout(() => setFlash(false), 600)
  }, [])

  const onStats = useCallback((stats) => {
    if (stats.total) setTotal(stats.total)
  }, [])

  useLinkAnalytics(shortCode, { onClick: onClickNew, onStats })

  useEffect(() => {
    setTotal(initialTotal)
  }, [initialTotal])

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px', marginBottom: '24px',
    }}>
      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span className="pulse" />
        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--danger)' }}>LIVE</span>
        <span style={{ color: 'var(--muted)', fontSize: '13px', marginLeft: '4px' }}>
          Real-time click feed
        </span>
      </div>

      {/* Counter */}
      <motion.div
        animate={{ scale: flash ? 1.05 : 1, color: flash ? 'var(--success)' : 'var(--text)' }}
        transition={{ duration: 0.2 }}
        style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '48px', lineHeight: 1, marginBottom: '8px' }}
      >
        {total.toLocaleString()}
      </motion.div>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>Total clicks</p>

      {/* Recent clicks feed */}
      <div>
        <p style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          Live Clicks
        </p>
        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <AnimatePresence initial={false}>
            {recentClicks.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Waiting for clicks...</p>
            ) : (
              recentClicks.map((click, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 10px', borderRadius: '6px',
                    background: i === 0 ? 'rgba(124,58,237,0.08)' : 'transparent',
                    fontSize: '13px',
                  }}
                >
                  <span>{click.countryCode ? countryFlag(click.countryCode) : '🌐'}</span>
                  <span style={{ color: 'var(--text)' }}>{click.country || 'Unknown'}</span>
                  <span style={{ color: 'var(--muted)' }}>•</span>
                  <span style={{ color: 'var(--muted)' }}>{click.browser || 'Unknown'}</span>
                  <span style={{ color: 'var(--muted)' }}>•</span>
                  <span style={{ color: 'var(--muted)' }}>{click.device || 'desktop'}</span>
                  <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontSize: '11px' }}>
                    {click.timestamp ? timeAgo(click.timestamp) : 'just now'}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function countryFlag(code) {
  if (!code || code.length !== 2) return '🌐'
  const codePoints = [...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

function timeAgo(timestamp) {
  const diff = (Date.now() - new Date(timestamp)) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}
