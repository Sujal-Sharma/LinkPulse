import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '10px 14px',
    }}>
      <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}>
        {format(parseISO(label), 'MMM d, yyyy')}
      </p>
      <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '18px' }}>
        {payload[0].value.toLocaleString()} clicks
      </p>
    </div>
  )
}

export default function ClicksChart({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>No data for this period</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--muted)', fontSize: 11 }}
          tickFormatter={(d) => {
            try { return format(parseISO(d), 'MMM d') } catch (_) { return d }
          }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="#7C3AED"
          strokeWidth={2}
          fill="url(#clickGrad)"
          dot={false}
          activeDot={{ r: 5, fill: '#7C3AED' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
