import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { linksApi } from '../services/api'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_BASE_URL || ''

export default function Landing() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const isLoggedIn = !!localStorage.getItem('accessToken')

  const handleShorten = async (e) => {
    e.preventDefault()
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    if (!url) return

    setLoading(true)
    try {
      const { data } = await linksApi.create({ originalUrl: url, title: 'Quick link' })
      setResult(data)
      setUrl('')
      toast.success('Link created!')
    } catch (err) {
      if (err.response?.status === 401) navigate('/login')
      else toast.error(err.response?.data?.error || 'Failed to shorten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>⚡</span>
          <span className="gradient-text" style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '20px' }}>
            LinkPulse
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/login" style={{
            padding: '7px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
            color: 'var(--muted)', border: '1px solid var(--border)', textDecoration: 'none',
          }}>
            Login
          </Link>
          <Link to="/register" style={{
            padding: '7px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
            background: 'var(--primary)', color: 'white', textDecoration: 'none',
          }}>
            Start Free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 24px 60px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Badge */}
          <span className="badge badge-primary" style={{ marginBottom: '24px' }}>
            ⚡ Built for Scale
          </span>

          <h1 style={{ fontSize: 'clamp(38px, 6vw, 64px)', fontFamily: 'Space Grotesk', fontWeight: 700, lineHeight: 1.1, marginBottom: '16px' }}>
            Short links.{' '}
            <span className="gradient-text">Real insights.</span>
            <br />Supercharged.
          </h1>

          <p style={{ color: 'var(--muted)', fontSize: '18px', maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            Create short links with real-time analytics, geographic data, and AI-powered insights.
            Know exactly who clicks your links.
          </p>

          {/* URL input */}
          <form onSubmit={handleShorten} style={{ display: 'flex', gap: '8px', maxWidth: '580px', margin: '0 auto 12px' }}>
            <input
              type="url"
              placeholder={isLoggedIn ? 'https://your-long-url.com/paste-here' : 'Sign in to shorten links'}
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={!isLoggedIn}
              style={{
                flex: 1, padding: '14px 18px', borderRadius: '10px',
                background: 'var(--card)', border: '1px solid var(--border)',
                color: isLoggedIn ? 'var(--text)' : 'var(--muted)', fontSize: '15px', outline: 'none',
                cursor: isLoggedIn ? 'text' : 'not-allowed', opacity: isLoggedIn ? 1 : 0.6,
              }}
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 24px', borderRadius: '10px', cursor: 'pointer',
                background: 'var(--primary)', color: 'white', border: 'none',
                fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap',
                boxShadow: '0 0 24px rgba(124,58,237,0.3)',
              }}
            >
              {loading ? '...' : isLoggedIn ? 'Shorten →' : 'Sign In →'}
            </motion.button>
          </form>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                maxWidth: '580px', margin: '0 auto 12px',
                padding: '14px 18px', borderRadius: '10px',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span className="mono" style={{ color: 'var(--success)', fontWeight: 500 }}>
                {result.shortUrl}
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(result.shortUrl); toast.success('Copied!') }}
                style={{
                  padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                  background: 'var(--success)', color: 'white', border: 'none', fontSize: '12px', fontWeight: 600,
                }}
              >
                Copy
              </button>
            </motion.div>
          )}

          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Sign in to start shortening links</p>
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: '960px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {[
            {
              icon: '⚡',
              title: 'Lightning Fast',
              desc: '< 10ms redirect latency with Redis caching. Your audience never waits.',
              color: 'var(--warning)',
            },
            {
              icon: '📊',
              title: 'Real-time Analytics',
              desc: 'See clicks as they happen. Geographic data, device breakdown, referrer tracking.',
              color: 'var(--primary)',
            },
            {
              icon: '🛡️',
              title: 'Rate Protected',
              desc: 'Token bucket rate limiting prevents bot abuse. Your links stay legitimate.',
              color: 'var(--success)',
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '14px', padding: '28px',
              }}
            >
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>{f.icon}</span>
              <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '18px', marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: '14px' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          maxWidth: '960px', margin: '0 auto', padding: '32px 24px',
          display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '24px',
        }}>
          {[
            ['Built for', 'Scale'],
            ['Cloud', 'Deployed'],
            ['< 10ms', 'Latency'],
            ['Global', 'Geo Tracking'],
          ].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p className="gradient-text" style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '28px' }}>{val}</p>
              <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '36px', fontWeight: 700, marginBottom: '16px' }}>
          Ready to start?
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: '32px', fontSize: '16px' }}>
          Free plan includes 50 links/day. No credit card required.
        </p>
        <Link
          to="/register"
          style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: '12px',
            background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '16px',
            textDecoration: 'none', boxShadow: '0 0 32px rgba(124,58,237,0.4)',
          }}
        >
          Get Started Free →
        </Link>
      </section>
    </div>
  )
}
