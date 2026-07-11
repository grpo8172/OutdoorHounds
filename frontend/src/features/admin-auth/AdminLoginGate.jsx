import { useEffect, useState } from 'react'
import { adminLogin, getAdminToken, setAdminToken, clearAdminToken, verifyAdminToken } from '../../api/client'

export function useAdminAuth() {
  const [token, setToken] = useState(() => getAdminToken())
  const [verified, setVerified] = useState(false)
  const [checking, setChecking] = useState(!!getAdminToken())
  const [isTryout, setIsTryout] = useState(false)

  useEffect(() => {
    if (!getAdminToken()) { setChecking(false); return }
    verifyAdminToken().then(valid => {
      if (valid) setVerified(true)
      else { setToken(''); setVerified(false) }
    }).finally(() => setChecking(false))
  }, [])

  const logout = () => { clearAdminToken(); setToken(''); setVerified(false); setIsTryout(false) }
  const onLogin = (t) => { setToken(t); setVerified(true); setIsTryout(false) }
  const onTryout = () => setIsTryout(true)
  return { isAdmin: verified || isTryout, isTryout, checking, logout, onLogin, onTryout }
}

const MOBILE_API_URL = import.meta.env.VITE_MOBILE_API_URL || 'http://localhost:3000'
const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || 'http://localhost:8081'

export default function AdminLoginGate({ onLogin, onTryout }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // After Google OAuth, the callback redirects back here with
  // ?sessionToken=xxx. Pick it up, exchange it for the admin token.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionToken = params.get('sessionToken')
    const oauthError = params.get('error')
    if (!sessionToken && !oauthError) return

    // Clean the URL immediately so a refresh doesn't retrigger this.
    const clean = new URL(window.location.href)
    clean.search = ''
    window.history.replaceState({}, '', clean.toString())

    if (oauthError) {
      setError('Google sign-in failed. Try again or use your access token.')
      return
    }

    setGoogleLoading(true)
    fetch(`${MOBILE_API_URL}/api/admin/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 402) {
            setError('Your Google account doesn\'t have an admin subscription yet. Purchase one below.')
          } else {
            setError(data.error || 'Sign-in failed. Try again.')
          }
          return
        }
        // Use the admin token to log in to the FastAPI admin backend.
        const loginData = await adminLogin(data.adminToken)
        onLogin(loginData.token)
      })
      .catch(() => setError('Could not reach the server. Try again.'))
      .finally(() => setGoogleLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleGoogleSignIn() {
    const returnTo = window.location.href.split('?')[0]
    window.location.href = `${MOBILE_API_URL}/api/oauth/google/initiate?returnTo=${encodeURIComponent(returnTo)}&platform=native`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await adminLogin(token)
      onLogin(data.token)
    } catch {
      setError('Incorrect password or access token. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const busy = loading || googleLoading

  return (
    <div style={{ maxWidth: 400, margin: '6rem auto', padding: '2rem', border: '1px solid #e5e7eb', borderRadius: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <h2 style={{ marginBottom: 6 }}>Admin access</h2>
      <p style={{ color: '#777', fontSize: '0.9rem', marginBottom: 24 }}>
        Sign in with the Google account you used to purchase admin access, or enter your password below.
      </p>

      {/* Google sign-in */}
      <button
        onClick={handleGoogleSignIn}
        disabled={busy}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0.65rem 1rem', border: '1px solid #ddd', borderRadius: 8, background: '#fff', fontSize: '0.95rem', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, marginBottom: 16 }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
        {googleLoading ? 'Signing in…' : 'Sign in with Google'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        <span style={{ fontSize: '0.8rem', color: '#aaa' }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      </div>

      {/* Password / token form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Password or access token"
          style={{ padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '1rem' }}
        />
        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={busy || !token}
          style={{ backgroundColor: '#e8843c', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem', fontSize: '1rem', cursor: 'pointer', opacity: busy ? 0.7 : 1 }}
        >
          {loading ? 'Checking…' : 'Sign in'}
        </button>
      </form>

      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f0ece4', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {onTryout && (
          <button
            onClick={onTryout}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.6rem', fontSize: '0.9rem', color: '#555', cursor: 'pointer' }}
          >
            Try it out
          </button>
        )}
        <p style={{ color: '#888', fontSize: '0.82rem', margin: 0 }}>
          Admin access costs an extra $30 on top of your listing subscription.
        </p>
        <a
          href={`${MOBILE_APP_URL}/admin-subscribe`}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-block', backgroundColor: '#f9f5f0', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.6rem 1.2rem', fontSize: '0.9rem', color: '#555', textDecoration: 'none', textAlign: 'center' }}
        >
          Get admin access — $30
        </a>
      </div>
    </div>
  )
}
