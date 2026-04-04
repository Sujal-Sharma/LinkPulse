import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = {
  desktop: '#7C3AED',
  mobile: '#06B6D4',
  tablet: '#10B981',
  other: '#6B6B80',
}

const ICONS = { desktop: '🖥', mobile: '📱', tablet: '📟', other: '❓' }

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null
}

export default function DeviceBreakdown({ data = [] }) {
  if (!data.length) {
    return <EmptyState />
  }

  const total = data.reduce((s, d) => s + d.clicks, 0)
  const chartData = data.map(d => ({
    name: d.device || 'unknown',
    value: d.clicks,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={80}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={COLORS[entry.name] || COLORS.other}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '13px',
            }}
            formatter={(v) => [v.toLocaleString(), 'clicks']}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
        {chartData.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '2px',
              background: COLORS[d.name] || COLORS.other, flexShrink: 0,
            }} />
            <span style={{ fontSize: '13px', flex: 1, textTransform: 'capitalize' }}>
              {ICONS[d.name] || ''} {d.name}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
              {total ? ((d.value / total) * 100).toFixed(1) : 0}%
            </span>
            <span style={{ fontWeight: 600, fontSize: '13px', width: '60px', textAlign: 'right' }}>
              {d.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>No device data yet</p>
    </div>
  )
}
