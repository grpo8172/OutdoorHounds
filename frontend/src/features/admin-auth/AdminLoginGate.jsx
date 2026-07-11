import { useState } from 'react'
import { adminLogin, getAdminToken, clearAdminToken } from '../../api/client'

export function useAdminAuth() {
  const [token, setToken] = useState(() => getAdminToken())
  const logout = () => { clearAdminToken(); setToken('') }
  const onLogin = (t) => setToken(t)
  return { isAdmin: !!token, logout, onLogin }
}

export default function AdminLoginGate({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await adminLogin(password)
      onLogin(data.token)
    } catch {
      setError('Incorrect password. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '8rem auto', padding: '2rem', border: '1px solid #e5e7eb', borderRadius: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <h2 style={{ marginBottom: 6 }}>Admin access</h2>
      <p style={{ color: '#777', fontSize: '0.9rem', marginBottom: 24 }}>Enter your admin password to continue.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Admin password"
          autoFocus
          style={{ padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '1rem' }}
        />
        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{ backgroundColor: '#e8843c', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem', fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
