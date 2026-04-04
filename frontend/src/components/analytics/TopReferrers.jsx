export default function TopReferrers({ data = [] }) {
  if (!data.length) {
    return <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No referrer data yet</p>
  }

  const total = data.reduce((s, d) => s + d.clicks, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((r, i) => {
        const pct = total ? ((r.clicks / total) * 100).toFixed(1) : 0
        return (
          <div key={r.referrerDomain || i}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>
                {r.referrerDomain === 'direct' ? '↩ Direct / None' : `🔗 ${r.referrerDomain}`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{pct}%</span>
                <span style={{ fontWeight: 600, fontSize: '13px', minWidth: '50px', textAlign: 'right' }}>
                  {r.clicks.toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--primary), var(--cyan))',
                borderRadius: '2px', transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
