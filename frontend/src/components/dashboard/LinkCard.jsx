import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import CopyButton from '../shared/CopyButton'
import Modal from '../shared/Modal'
import Button from '../shared/Button'
import { useDeleteLink, useUpdateLink } from '../../hooks/useLinks'

const BASE_URL = import.meta.env.VITE_BASE_URL || ''

export default function LinkCard({ link }) {
  const navigate = useNavigate()
  const deleteLink = useDeleteLink()
  const updateLink = useUpdateLink()
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    title: link.title || '',
    originalUrl: link.originalUrl || '',
    expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : '',
    maxClicksPerDay: link.maxClicksPerDay || '',
  })

  const shortUrl = `${BASE_URL}/r/${link.shortCode}`
  const isActive = link.isActive
  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date()

  const handleToggleActive = () => {
    updateLink.mutate({ id: link._id, isActive: !link.isActive })
  }

  const handleDelete = () => {
    if (window.confirm('Delete this link permanently?')) {
      deleteLink.mutate(link._id)
    }
    setShowMenu(false)
  }

  const handleEdit = () => {
    const payload = {
      id: link._id,
      title: editForm.title,
      originalUrl: editForm.originalUrl,
    }
    if (editForm.expiresAt) payload.expiresAt = new Date(editForm.expiresAt).toISOString()
    else payload.expiresAt = null
    if (editForm.maxClicksPerDay) payload.maxClicksPerDay = parseInt(editForm.maxClicksPerDay, 10)
    else payload.maxClicksPerDay = null

    updateLink.mutate(payload, {
      onSuccess: () => setShowEdit(false),
    })
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '14px', outline: 'none',
  }
  const labelStyle = { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {link.title && (
              <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {link.title}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="mono" style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '15px' }}>
                {shortUrl}
              </span>
              <CopyButton text={shortUrl}>Copy</CopyButton>
            </div>
            <p style={{
              color: 'var(--muted)', fontSize: '12px', marginTop: '4px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '400px',
            }}>
              {link.originalUrl}
            </p>
          </div>

          {/* Status badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span className={`badge ${isExpired ? 'badge-danger' : isActive ? 'badge-success' : 'badge-muted'}`}>
              {isExpired ? 'Expired' : isActive ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <Stat label="Total Clicks" value={link.analytics?.totalClicks || 0} />
          <Stat label="Today" value={link.analytics?.clicksToday || 0} />
          <Stat label="Created" value={formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })} />

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ActionBtn onClick={() => navigate(`/analytics/${link.shortCode}`)} title="Analytics">📊</ActionBtn>
            <ActionBtn onClick={handleToggleActive} title={isActive ? 'Pause' : 'Activate'}>
              {isActive ? '⏸' : '▶'}
            </ActionBtn>
            <ActionBtn onClick={() => { setShowEdit(true); setShowMenu(false) }} title="Edit">✏️</ActionBtn>
            <div style={{ position: 'relative' }}>
              <ActionBtn onClick={() => setShowMenu(s => !s)} title="More">•••</ActionBtn>
              {showMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: '4px', zIndex: 10,
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px',
                  minWidth: '130px', overflow: 'hidden',
                }}>
                  <MenuItemBtn onClick={handleDelete} danger>Delete</MenuItemBtn>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Link">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} type="text" placeholder="Campaign name"
              value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Destination URL</label>
            <input style={inputStyle} type="url" placeholder="https://example.com"
              value={editForm.originalUrl} onChange={e => setEditForm(f => ({ ...f, originalUrl: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Expiry Date</label>
            <input style={inputStyle} type="datetime-local"
              value={editForm.expiresAt} onChange={e => setEditForm(f => ({ ...f, expiresAt: e.target.value }))} />
            {editForm.expiresAt && (
              <button onClick={() => setEditForm(f => ({ ...f, expiresAt: '' }))}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
                ✕ Clear expiry
              </button>
            )}
          </div>
          <div>
            <label style={labelStyle}>Max Clicks/Day</label>
            <input style={inputStyle} type="number" placeholder="Leave empty for unlimited"
              value={editForm.maxClicksPerDay} onChange={e => setEditForm(f => ({ ...f, maxClicksPerDay: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} loading={updateLink.isLoading}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontWeight: 600, fontSize: '15px' }}>{value}</p>
    </div>
  )
}

function ActionBtn({ onClick, title, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={title}
      style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
        padding: '6px 10px', cursor: 'pointer', color: 'var(--muted)',
        fontSize: '14px', transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
    >
      {children}
    </motion.button>
  )
}

function MenuItemBtn({ onClick, danger, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: danger ? 'var(--danger)' : 'var(--text)', fontSize: '14px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  )
}
