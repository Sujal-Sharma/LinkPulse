import { useState } from 'react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import { useCreateLink } from '../../hooks/useLinks'

export default function CreateLinkModal({ isOpen, onClose }) {
  const createLink = useCreateLink()
  const [form, setForm] = useState({
    originalUrl: '', customCode: '', title: '',
    expiresAt: '', password: '', maxClicksPerDay: '',
    abTestEnabled: false,
    variantAUrl: '', variantBUrl: '',
    variantAWeight: 50, variantBWeight: 50,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { originalUrl: form.originalUrl }
    if (form.customCode) data.customCode = form.customCode
    if (form.title) data.title = form.title
    if (form.expiresAt) data.expiresAt = new Date(form.expiresAt).toISOString()
    if (form.password) data.password = form.password
    if (form.maxClicksPerDay) data.maxClicksPerDay = parseInt(form.maxClicksPerDay, 10)
    if (form.abTestEnabled) {
      data.abTest = {
        enabled: true,
        variantA: { url: form.variantAUrl, weight: form.variantAWeight },
        variantB: { url: form.variantBUrl, weight: form.variantBWeight },
      }
    }
    const result = await createLink.mutateAsync(data)
    if (result) onClose()
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s',
  }

  const labelStyle = { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Short Link" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Destination URL *</label>
          <input
            style={inputStyle} required
            type="url" placeholder="https://your-long-url.com/paste-here"
            value={form.originalUrl} onChange={e => set('originalUrl', e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Title (optional)</label>
          <input
            style={inputStyle} type="text" placeholder="Campaign name or description"
            value={form.title} onChange={e => set('title', e.target.value)}
          />
        </div>

        {/* Advanced options toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(s => !s)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--primary)', fontSize: '13px', fontWeight: 500,
            textAlign: 'left', padding: '4px 0',
          }}
        >
          {showAdvanced ? '▼' : '▶'} Advanced options
        </button>

        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div>
              <label style={labelStyle}>Custom code (optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>pulse.ly/</span>
                <input style={inputStyle} type="text" placeholder="my-custom-code"
                  value={form.customCode} onChange={e => set('customCode', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Expiry date</label>
              <input style={inputStyle} type="datetime-local"
                value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Password protection</label>
              <input style={inputStyle} type="password" placeholder="Optional password"
                value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Max clicks/day</label>
              <input style={inputStyle} type="number" placeholder="e.g. 1000"
                value={form.maxClicksPerDay} onChange={e => set('maxClicksPerDay', e.target.value)} />
            </div>

            {/* A/B Test */}
            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.abTestEnabled}
                  onChange={e => set('abTestEnabled', e.target.checked)} />
                Enable A/B Testing
              </label>
            </div>

            {form.abTestEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Variant A URL ({form.variantAWeight}%)</label>
                  <input style={inputStyle} type="url" placeholder="https://variant-a.com"
                    value={form.variantAUrl} onChange={e => set('variantAUrl', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Variant B URL ({form.variantBWeight}%)</label>
                  <input style={inputStyle} type="url" placeholder="https://variant-b.com"
                    value={form.variantBUrl} onChange={e => set('variantBUrl', e.target.value)} />
                </div>
                <input type="range" min="0" max="100" value={form.variantAWeight}
                  onChange={e => { const v = parseInt(e.target.value); set('variantAWeight', v); set('variantBWeight', 100 - v) }} />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={createLink.isLoading}>
            ⚡ Shorten
          </Button>
        </div>
      </form>
    </Modal>
  )
}
