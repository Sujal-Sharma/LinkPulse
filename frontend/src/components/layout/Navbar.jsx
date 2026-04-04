import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { authApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    try { await authApi.logout() } catch (_) {}
    localStorage.removeItem('accessToken')
    if (setUser) setUser(null)
    navigate('/login')
    toast.success('Logged out')
    setShowMenu(false)
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px', height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <span style={{ fontSize: '22px' }}>⚡</span>
        <span className="gradient-text" style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '20px' }}>
          LinkPulse
        </span>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/workspace">Workspace</NavLink>
      </div>

      {/* User avatar menu */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          onClick={() => setShowMenu(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '6px 12px 6px 6px',
            cursor: 'pointer', transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name}
              style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--cyan))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: 'white',
            }}>
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: '14px', color: 'var(--text)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || user?.email || 'Account'}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: '10px' }}>▼</span>
        </button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 50,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '10px', minWidth: '180px', overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>{user?.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </p>
              </div>
              <DropdownItem to="/profile" onClick={() => setShowMenu(false)}>Profile & Settings</DropdownItem>
              <DropdownItem to="/workspace" onClick={() => setShowMenu(false)}>Workspaces</DropdownItem>
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={handleLogout} style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--danger)', fontSize: '14px', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

function NavLink({ to, children }) {
  return (
    <Link to={to} style={{
      padding: '6px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
      color: 'var(--muted)', transition: 'all 0.2s', textDecoration: 'none',
    }}
      onMouseEnter={e => { e.target.style.color = 'var(--text)'; e.target.style.background = 'var(--card)' }}
      onMouseLeave={e => { e.target.style.color = 'var(--muted)'; e.target.style.background = 'transparent' }}
    >
      {children}
    </Link>
  )
}

function DropdownItem({ to, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} style={{
      display: 'block', padding: '10px 16px',
      color: 'var(--text)', fontSize: '14px',
      textDecoration: 'none', transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </Link>
  )
}
