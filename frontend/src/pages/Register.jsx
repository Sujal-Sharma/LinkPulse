import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Register({ setUser }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.register(form)
      localStorage.setItem('accessToken', data.accessToken)
      setUser(data.user)
      toast.success(`Welcome to LinkPulse, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '40px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '32px' }}>⚡</span>
          <p className="gradient-text" style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '24px', marginTop: '8px' }}>
            LinkPulse
          </p>
          <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '14px' }}>
            Create your free account
          </p>
        </div>

        {/* Google OAuth button */}
        <a
          href={`${import.meta.env.VITE_API_URL}/auth/google`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            width: '100%', padding: '11px', borderRadius: '10px', marginBottom: '20px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', fontWeight: 500, fontSize: '14px',
            textDecoration: 'none', transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { key: 'password', label: 'Password', type: 'password', placeholder: '8+ characters' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                {label}
              </label>
              <input
                type={type} required placeholder={placeholder}
                value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '14px', outline: 'none',
                }}
              />
            </div>
          ))}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px',
              background: 'var(--primary)', color: 'white', border: 'none',
              fontWeight: 600, fontSize: '15px', cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: '8px',
            }}
          >
            {loading ? 'Creating account...' : 'Create Account →'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
