import { motion } from 'framer-motion'
import { useAnalyticsOverview } from '../../hooks/useAnalytics'
import Spinner from '../shared/Spinner'

function StatCard({ label, value, icon, color = 'var(--primary)', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '20px 24px', flex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ fontSize: '20px' }}>{icon}</span>
      </div>
      <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Space Grotesk', color }}>
        {value ?? '—'}
      </p>
    </motion.div>
  )
}

export default function StatsBar() {
  const { data, isLoading } = useAnalyticsOverview()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', gap: '16px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ flex: 1, height: '96px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size={20} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <StatCard label="Total Links" value={data?.totalLinks?.toLocaleString()} icon="🔗" delay={0} />
      <StatCard label="Clicks Today" value={data?.clicksToday?.toLocaleString()} icon="📈" color="var(--success)" delay={0.05} />
      <StatCard label="Active Links" value={data?.activeLinks?.toLocaleString()} icon="✅" color="var(--cyan)" delay={0.1} />
      <StatCard label="All-Time Clicks" value={data?.totalClicks?.toLocaleString()} icon="🌍" color="var(--warning)" delay={0.15} />
    </div>
  )
}
