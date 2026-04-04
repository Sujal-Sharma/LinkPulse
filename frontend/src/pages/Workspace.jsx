import { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import Modal from '../components/shared/Modal'
import Button from '../components/shared/Button'
import Spinner from '../components/shared/Spinner'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { workspacesApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Workspace({ user }) {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState(null)   // workspace object
  const [showMembers, setShowMembers] = useState(null) // workspace object
  const [createForm, setCreateForm] = useState({ name: '' })
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'editor' })

  const { data, isLoading } = useQuery('workspaces', async () => {
    const { data } = await workspacesApi.list()
    return data
  })

  const createWs = useMutation(
    () => workspacesApi.create(createForm),
    {
      onSuccess: () => {
        qc.invalidateQueries('workspaces')
        setShowCreate(false)
        setCreateForm({ name: '' })
        toast.success('Workspace created')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
    }
  )

  const inviteMember = useMutation(
    () => workspacesApi.invite(showInvite?._id, inviteForm),
    {
      onSuccess: () => {
        qc.invalidateQueries('workspaces')
        setShowInvite(null)
        setInviteForm({ email: '', role: 'editor' })
        toast.success('Member invited')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to invite'),
    }
  )

  const deleteWs = useMutation(
    (id) => workspacesApi.delete(id),
    {
      onSuccess: () => {
        qc.invalidateQueries('workspaces')
        toast.success('Workspace deleted')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete'),
    }
  )

  const removeMember = useMutation(
    ({ workspaceId, memberId }) => workspacesApi.removeMember(workspaceId, memberId),
    {
      onSuccess: (_, { workspaceId }) => {
        qc.invalidateQueries('workspaces')
        // Update the showMembers state with fresh data
        const updated = data?.workspaces?.find(w => w._id === workspaceId)
        if (updated) setShowMembers(updated)
        toast.success('Member removed')
      },
      onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove'),
    }
  )

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '14px', outline: 'none',
  }

  const workspaces = data?.workspaces || []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar user={user} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '28px' }}>Workspaces</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>Organize and collaborate on your links</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ New Workspace</Button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Spinner size={32} />
          </div>
        ) : workspaces.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px',
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
          }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>🏢</p>
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, marginBottom: '8px' }}>No workspaces yet</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>Create a workspace to organize your links by team or project</p>
            <Button onClick={() => setShowCreate(true)}>Create Workspace</Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {workspaces.map(ws => (
              <WorkspaceCard
                key={ws._id}
                workspace={ws}
                currentUserId={user?._id}
                onInvite={() => setShowInvite(ws)}
                onViewMembers={() => setShowMembers(ws)}
                onDelete={() => {
                  if (confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)) {
                    deleteWs.mutate(ws._id)
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create workspace modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Workspace">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
              Workspace Name
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Marketing Team"
              value={createForm.name}
              onChange={e => setCreateForm({ name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && createWs.mutate()}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createWs.mutate()} loading={createWs.isLoading}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Invite modal */}
      <Modal isOpen={!!showInvite} onClose={() => setShowInvite(null)} title={`Invite to "${showInvite?.name}"`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            The user must already have a LinkPulse account.
          </p>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email</label>
            <input
              style={inputStyle} type="email" placeholder="colleague@company.com"
              value={inviteForm.email}
              onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Role</label>
            <select style={inputStyle} value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
              <option value="viewer">Viewer — can view links and analytics</option>
              <option value="editor">Editor — can create and manage links</option>
              <option value="admin">Admin — can invite and manage members</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setShowInvite(null)}>Cancel</Button>
            <Button onClick={() => inviteMember.mutate()} loading={inviteMember.isLoading}>Send Invite</Button>
          </div>
        </div>
      </Modal>

      {/* Members modal */}
      <Modal isOpen={!!showMembers} onClose={() => setShowMembers(null)} title={`Members — ${showMembers?.name}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {showMembers?.members?.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No members yet.</p>
          )}
          {showMembers?.members?.map((m, i) => {
            const isOwner = showMembers.ownerId?._id === m.userId?._id ||
              showMembers.ownerId === m.userId?._id
            const isCurrentUser = m.userId?._id === user?._id || m.userId?._id === user?.id
            const canRemove = showMembers.ownerId?._id === user?._id ||
              showMembers.ownerId === user?._id
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '8px', background: 'var(--bg)',
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: `hsl(${(i * 60) % 360}, 60%, 45%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
                }}>
                  {(m.userId?.name || m.userId?.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.userId?.name || 'Unknown'}
                    {isCurrentUser && <span style={{ color: 'var(--muted)', fontSize: '12px', marginLeft: '6px' }}>(you)</span>}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.userId?.email}
                  </p>
                </div>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                  background: isOwner ? 'rgba(124,58,237,0.15)' : 'var(--border)',
                  color: isOwner ? 'var(--primary)' : 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {isOwner ? 'owner' : m.role}
                </span>
                {canRemove && !isOwner && !isCurrentUser && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${m.userId?.name || m.userId?.email}?`)) {
                        removeMember.mutate({ workspaceId: showMembers._id, memberId: m.userId?._id })
                        setShowMembers(prev => ({
                          ...prev,
                          members: prev.members.filter((_, idx) => idx !== i),
                        }))
                      }
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--danger)', fontSize: '16px', padding: '2px 4px',
                    }}
                    title="Remove member"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Button onClick={() => { setShowMembers(null); setShowInvite(showMembers) }}>
              + Invite Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function WorkspaceCard({ workspace, currentUserId, onInvite, onViewMembers, onDelete }) {
  const isOwner = workspace.ownerId?._id === currentUserId || workspace.ownerId === currentUserId

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--primary), var(--cyan))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', fontWeight: 700, color: 'white',
        }}>
          {workspace.name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspace.name}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '12px' }}>/{workspace.slug}</p>
        </div>
        {isOwner && (
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
            background: 'rgba(124,58,237,0.15)', color: 'var(--primary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Owner
          </span>
        )}
      </div>

      {/* Member avatars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {workspace.members?.slice(0, 5).map((m, i) => (
            <div
              key={i}
              title={m.userId?.name || m.userId?.email}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: `hsl(${(i * 60) % 360}, 60%, 45%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: 'white',
                border: '2px solid var(--card)',
                marginLeft: i > 0 ? '-6px' : '0',
              }}
            >
              {(m.userId?.name || m.userId?.email || '?')[0].toUpperCase()}
            </div>
          ))}
          {workspace.members?.length > 5 && (
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--border)', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, marginLeft: '-6px',
              border: '2px solid var(--card)',
            }}>
              +{workspace.members.length - 5}
            </div>
          )}
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
          {workspace.members?.length || 0} member{workspace.members?.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onViewMembers}
          style={{
            flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer',
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '13px', fontWeight: 500,
          }}
        >
          Members
        </button>
        <button
          onClick={onInvite}
          style={{
            flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer',
            background: 'var(--primary)', border: 'none',
            color: 'white', fontSize: '13px', fontWeight: 500,
          }}
        >
          + Invite
        </button>
        {isOwner && (
          <button
            onClick={onDelete}
            style={{
              padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--danger)', fontSize: '13px',
            }}
            title="Delete workspace"
          >
            🗑
          </button>
        )}
      </div>
    </motion.div>
  )
}
