import { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import StatsBar from '../components/dashboard/StatsBar'
import LinkCard from '../components/dashboard/LinkCard'
import CreateLinkModal from '../components/dashboard/CreateLinkModal'
import Button from '../components/shared/Button'
import Spinner from '../components/shared/Spinner'
import { useLinks } from '../hooks/useLinks'

export default function Dashboard({ user }) {
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useLinks({ page, limit: 15, search: search || undefined })
  const links = data?.links || []
  const pagination = data?.pagination

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar user={user} />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontFamily: 'Space Grotesk', fontWeight: 700 }}>Dashboard</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
              Manage your short links and track performance
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>⚡ Create Link</Button>
        </div>

        {/* Stats bar */}
        <div style={{ marginBottom: '28px' }}>
          <StatsBar />
        </div>

        {/* Search + filter bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search links..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{
              flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px',
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        {/* Links list */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Spinner size={32} />
          </div>
        ) : links.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreate(true)} />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {links.map(link => (
                <LinkCard key={link._id} link={link} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                {[...Array(pagination.pages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: page === i + 1 ? 'var(--primary)' : 'var(--card)',
                      color: page === i + 1 ? 'white' : 'var(--muted)',
                      fontWeight: page === i + 1 ? 600 : 400,
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <CreateLinkModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}

function EmptyState({ onCreateClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        textAlign: 'center', padding: '80px 24px',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '16px',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
      <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '20px', marginBottom: '8px' }}>
        No links yet
      </h3>
      <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
        Create your first short link and start tracking clicks in real time.
      </p>
      <Button onClick={onCreateClick}>⚡ Create Your First Link</Button>
    </motion.div>
  )
}
