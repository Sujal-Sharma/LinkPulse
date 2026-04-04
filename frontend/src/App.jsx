import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Workspace from './pages/Workspace'
import AuthCallback from './pages/AuthCallback'
import Profile from './pages/Profile'
import Spinner from './components/shared/Spinner'
import { authApi } from './services/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children, user, loading }) {
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Spinner size={36} />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setAuthLoading(false)
      return
    }

    authApi.me()
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('accessToken')
      })
      .finally(() => setAuthLoading(false))
  }, [])

  const withUser = (Component) => (
    <ProtectedRoute user={user} loading={authLoading}>
      <Component user={user} />
    </ProtectedRoute>
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--card)' } },
            error: { iconTheme: { primary: 'var(--danger)', secondary: 'var(--card)' } },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route path="/dashboard" element={withUser(Dashboard)} />
          <Route path="/analytics/:shortCode" element={withUser(Analytics)} />
          <Route path="/workspace" element={withUser(Workspace)} />
          <Route path="/auth/callback" element={<AuthCallback setUser={setUser} />} />
          <Route path="/profile" element={
            <ProtectedRoute user={user} loading={authLoading}>
              <Profile user={user} setUser={setUser} />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
