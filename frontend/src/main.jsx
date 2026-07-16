import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Storefront from './features/storefront/Storefront'
import Marketplace from './features/marketplace/Marketplace'
import OwnerSetup from './features/owner-setup/OwnerSetup'
import AdminDashboard from './features/admin-dashboard/AdminDashboard'
import CustomerChat from './features/customer-chat/CustomerChat'
import ItemDetail from './features/storefront/ItemDetail'
import { getConfig, getAdminToken, getMyConfig } from './api/client'
import './index.css'

const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || 'http://localhost:8081'

// Every tenant's public site lives at /t/<slug> (root `/` stays the
// original/default tenant, unchanged). /setup and /admin deliberately stay
// slug-less — which tenant they operate on is resolved server-side from the
// logged-in admin's own token, never a URL param, so one admin can't view
// or edit another's site by editing the address bar.
function AppInner() {
  const [siteName, setSiteName] = useState('Outdoor Hounds')
  const [siteEmoji, setSiteEmoji] = useState('🐾')
  // The logged-in admin's OWN tenant — independent of whatever slug is in
  // the URL right now. Lets us offer a way back to "my site" even while
  // browsing the marketplace or someone else's storefront, instead of the
  // ordinary Home link (which just points at whichever tenant you're
  // currently viewing).
  const [myTenant, setMyTenant] = useState(null)
  const location = useLocation()
  const tenantMatch = location.pathname.match(/^\/t\/([^/]+)/)
  const slug = tenantMatch ? tenantMatch[1] : undefined
  const homeHref = slug ? `/t/${slug}` : '/'

  useEffect(() => {
    if (!getAdminToken()) return
    getMyConfig().then(setMyTenant).catch(() => {})
  }, [])

  const myHomeHref = myTenant ? (myTenant.slug ? `/t/${myTenant.slug}` : '/') : null
  // Only true once we know both the current page's tenant AND the admin's
  // own tenant, and they genuinely differ — avoids a false-positive flash
  // while myTenant is still loading (myTenant null) or on slug-less pages.
  const viewingSomeoneElse = !!(myTenant && slug !== undefined && myTenant.slug !== slug)

  useEffect(() => {
    // Applied on <html> (not a component wrapper) so it reaches <body>'s
    // own background — a CSS var set on a descendant div can't cascade
    // upward to an ancestor. Always set-or-remove (never "only if truthy")
    // so navigating from a themed tenant to one with no custom colour
    // resets cleanly instead of leaking the previous tenant's palette.
    const applyVar = (name, value) => {
      if (value) document.documentElement.style.setProperty(name, value)
      else document.documentElement.style.removeProperty(name)
    }
    getConfig(slug)
      .then(d => {
        if (d.business_name) setSiteName(d.business_name)
        if (d.site_emoji) setSiteEmoji(d.site_emoji)
        applyVar('--accent', d.brand_color)
        applyVar('--banner', d.banner_color)
        applyVar('--bg', d.background_color)
      })
      .catch(() => {})
  }, [slug])

  return (
    <>
      <nav className="navbar">
        <Link to={homeHref} className="brand">{siteEmoji} {siteName}</Link>
        <div className="nav-links">
          {/* General/public nav first. Fixed to "/" (not homeHref) — this is
              always the platform's own demo tenant, not "whichever site
              you're currently on", so the label stays accurate no matter
              which tenant a visitor or admin is actually viewing. */}
          <Link to="/">👀 Sample Homepage</Link>
          <Link to="/marketplace">🛍️ App Marketplace</Link>
          <Link to="/chat">Ask Us</Link>
          {/* /reset-tenant (not a bare link) for the default tenant — the
              app persists whichever tenant was last joined on that device,
              so a bare open would silently keep showing someone else's
              community instead of landing back on this one. */}
          <a href={`${MOBILE_APP_URL}${slug ? `/t/${slug}` : '/reset-tenant'}`} target="_blank" rel="noreferrer">📱 Open Your App</a>

          {/* Owner/admin tools grouped together at the end. */}
          {myHomeHref && (
            <Link to={myHomeHref} style={{ background: 'rgba(255,255,255,0.32)', fontWeight: 700 }}>🏠 My Site</Link>
          )}
          <Link to="/setup" style={{ background: 'rgba(255,255,255,0.32)', fontWeight: 700 }}>🚀 Setup Your App</Link>
          <Link to="/admin">Admin</Link>
        </div>
      </nav>
      {viewingSomeoneElse && (
        <div style={{ background: '#fff8e1', borderBottom: '3px solid #e8843c', padding: '0.6rem 1rem', textAlign: 'center', fontSize: '0.9rem', color: '#7a5a1a' }}>
          🔍 You're viewing <strong>{siteName}</strong>'s site — this isn't yours.{' '}
          <Link to={myHomeHref} style={{ color: '#e8843c', fontWeight: 700 }}>Back to my site →</Link>
        </div>
      )}
      <main className="container">
        <Routes>
          <Route path="/" element={<Storefront />} />
          <Route path="/t/:slug" element={<Storefront />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/chat" element={<CustomerChat />} />
          <Route path="/setup" element={<OwnerSetup />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/t/:slug/items/:id" element={<ItemDetail />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
