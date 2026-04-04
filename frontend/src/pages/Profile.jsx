import { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Profile({ user, setUser }) {
  const [nameForm, setNameForm] = useState({ name: user?.name || '' })
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [savingName, setSavingName] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  const handleUpdateName = async (e) => {
    e.preventDefault()
    setSavingName(true)
    try {
      const { data } = await authApi.updateProfile({ name: nameForm.name })
      setUser(data.user)
      toast.success('Name updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPass(true)
    try {
      await authApi.changePassword({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      })
      toast.success('Password updated')
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password')
    } finally {
      setSavingPass(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '14px', outline: 'none',
  }
  const labelStyle = { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' }

  const isGoogleUser = !user?.password && user?.googleId

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar user={user} setUser={setUser} />

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '28px', marginBottom: '32px' }}>
          Profile
        </h1>

        {/* Avatar + info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '24px',
            display: 'flex', alignItems: 'center', gap: '20px',
            marginBottom: '24px',
          }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name}
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--cyan))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ fontWeight: 600, fontSize: '18px', fontFamily: 'Space Grotesk' }}>{user?.name}</p>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '2px' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                background: 'rgba(124,58,237,0.15)', color: 'var(--primary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {user?.plan || 'free'}
              </span>
              {isGoogleUser && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                  background: 'rgba(66,133,244,0.15)', color: '#4285F4',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Google
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Update name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '24px', marginBottom: '24px',
          }}
        >
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '16px', marginBottom: '20px' }}>
            Display Name
          </h2>
          <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} type="text" required
                value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                type="email" value={user?.email || ''} disabled />
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Email cannot be changed</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={savingName} style={{
                padding: '9px 20px', borderRadius: '8px', cursor: savingName ? 'wait' : 'pointer',
                background: 'var(--primary)', color: 'white', border: 'none',
                fontWeight: 600, fontSize: '14px', opacity: savingName ? 0.7 : 1,
              }}>
                {savingName ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Change password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '24px',
          }}
        >
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
            {isGoogleUser ? 'Set Password' : 'Change Password'}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
            {isGoogleUser
              ? 'Set a password to also sign in with email/password'
              : 'Choose a strong password with at least 8 characters'}
          </p>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!isGoogleUser && (
              <div>
                <label style={labelStyle}>Current Password</label>
                <input style={inputStyle} type="password" required placeholder="••••••••"
                  value={passForm.currentPassword}
                  onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))} />
              </div>
            )}
            <div>
              <label style={labelStyle}>New Password</label>
              <input style={inputStyle} type="password" required placeholder="8+ characters" minLength={8}
                value={passForm.newPassword}
                onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input style={inputStyle} type="password" required placeholder="Repeat new password"
                value={passForm.confirmPassword}
                onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={savingPass} style={{
                padding: '9px 20px', borderRadius: '8px', cursor: savingPass ? 'wait' : 'pointer',
                background: 'var(--primary)', color: 'white', border: 'none',
                fontWeight: 600, fontSize: '14px', opacity: savingPass ? 0.7 : 1,
              }}>
                {savingPass ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
