import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/shared/Spinner'

export default function AuthCallback({ setUser }) {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const error = params.get('error')

    if (error || !token) {
      navigate('/login?error=google_failed')
      return
    }

    // Store access token
    localStorage.setItem('accessToken', token)

    // Remove token from URL immediately
    window.history.replaceState({}, '', '/auth/callback')

    // Fetch user profile
    fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          navigate('/dashboard')
        } else {
          navigate('/login?error=google_failed')
        }
      })
      .catch(() => navigate('/login?error=google_failed'))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner size={40} />
        <p style={{ color: 'var(--muted)', marginTop: '16px' }}>Signing you in...</p>
      </div>
    </div>
  )
}
