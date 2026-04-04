import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import LiveCounter from '../components/analytics/LiveCounter'
import ClicksChart from '../components/analytics/ClicksChart'
import GeoHeatmap from '../components/analytics/GeoHeatmap'
import DeviceBreakdown from '../components/analytics/DeviceBreakdown'
import TopReferrers from '../components/analytics/TopReferrers'
import Spinner from '../components/shared/Spinner'
import { useLinkAnalyticsData } from '../hooks/useAnalytics'
import { analyticsApi } from '../services/api'
import toast from 'react-hot-toast'

const PERIODS = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All Time', value: 'all' },
]

export default function Analytics({ user }) {
  const { shortCode } = useParams()
  const [period, setPeriod] = useState('30d')
  const { data, isLoading } = useLinkAnalyticsData(shortCode, period)

  const handleExport = async () => {
    try {
      const response = await analyticsApi.export(shortCode, period)
      const url = URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${shortCode}-${period}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } catch {
      toast.error('Export failed')
    }
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar user={user} />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <Spinner size={40} />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { link, summary, timeSeries, countries, cities, devices, browsers, referrers } = data

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar user={user} />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <Link to="/dashboard" style={{ color: 'var(--muted)', fontSize: '13px', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
            <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '26px', fontWeight: 700, marginTop: '8px' }}>
              Analytics — <span className="gradient-text mono">{shortCode}</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
              {link?.originalUrl}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Period tabs */}
            <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', border: 'none',
                    background: period === p.value ? 'var(--primary)' : 'transparent',
                    color: period === p.value ? 'white' : 'var(--muted)',
                    fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleExport}
              style={{
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                background: 'var(--card)', border: '1px solid var(--border)',
                color: 'var(--muted)', fontSize: '13px', fontWeight: 500,
              }}
            >
              ⬇ Export CSV
            </motion.button>
          </div>
        </div>

        {/* Live counter + summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '24px' }}>
          <LiveCounter shortCode={shortCode} initialTotal={summary?.totalClicks || 0} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', alignContent: 'start' }}>
            {[
              { label: 'Total Clicks', value: summary?.totalClicks || 0, icon: '👆' },
              { label: 'Unique Clicks', value: summary?.uniqueClicks || 0, icon: '👤' },
              { label: 'Clicks Today', value: summary?.clicksToday || 0, icon: '📅', color: 'var(--success)' },
              { label: 'This Hour', value: summary?.clicksThisHour || 0, icon: '⏱', color: 'var(--cyan)' },
            ].map(({ label, value, icon, color }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span>{icon}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                </div>
                <p style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Space Grotesk', color: color || 'var(--text)' }}>
                  {value.toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Clicks over time */}
        <Section title="Clicks Over Time">
          <ClicksChart data={timeSeries} />
        </Section>

        {/* Geo + Device */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <Section title="Geographic Distribution">
            <GeoHeatmap countries={countries} />
          </Section>
          <Section title="Device Breakdown">
            <DeviceBreakdown data={devices} />
          </Section>
        </div>

        {/* Cities */}
        {cities?.length > 0 && (
          <Section title="Top Cities">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cities.map((c, i) => {
                const maxCityClicks = cities[0]?.clicks || 1
                const pct = ((c.clicks / maxCityClicks) * 100).toFixed(0)
                return (
                  <div key={`${c.city}-${c.countryCode}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '12px', width: '16px' }}>{i + 1}</span>
                    <span style={{ fontSize: '14px' }}>{countryFlag(c.countryCode)}</span>
                    <span style={{ flex: 1, fontSize: '13px' }}>
                      {c.city}
                      {c.region && c.region !== c.city && (
                        <span style={{ color: 'var(--muted)', marginLeft: '6px', fontSize: '12px' }}>{c.region}</span>
                      )}
                    </span>
                    <div style={{ width: '80px', height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--success)', borderRadius: '2px' }} />
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: '12px', width: '50px', textAlign: 'right' }}>
                      {c.clicks.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Referrers + Browsers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <Section title="Top Referrers">
            <TopReferrers data={referrers} />
          </Section>
          <Section title="Browsers">
            {browsers?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {browsers.map(b => {
                  const total = browsers.reduce((s, x) => s + x.clicks, 0)
                  const pct = total ? ((b.clicks / total) * 100).toFixed(1) : 0
                  return (
                    <div key={b.browser}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                        <span>{b.browser || 'Unknown'}</span>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ color: 'var(--muted)' }}>{pct}%</span>
                          <span style={{ fontWeight: 600 }}>{b.clicks.toLocaleString()}</span>
                        </div>
                      </div>
                      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--cyan)', borderRadius: '2px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No browser data yet</p>}
          </Section>
        </div>
      </main>
    </div>
  )
}

function countryFlag(code) {
  if (!code || code.length !== 2) return '🌐'
  const codePoints = [...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px', marginBottom: '0',
    }}>
      <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '15px', marginBottom: '16px', color: 'var(--muted)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
