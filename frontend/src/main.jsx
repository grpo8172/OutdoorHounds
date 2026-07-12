import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Storefront from './features/storefront/Storefront'
import OwnerSetup from './features/owner-setup/OwnerSetup'
import AdminDashboard from './features/admin-dashboard/AdminDashboard'
import CustomerChat from './features/customer-chat/CustomerChat'
import ItemDetail from './features/storefront/ItemDetail'
import { getConfig } from './api/client'
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
  const location = useLocation()
  const tenantMatch = location.pathname.match(/^\/t\/([^/]+)/)
  const slug = tenantMatch ? tenantMatch[1] : undefined
  const homeHref = slug ? `/t/${slug}` : '/'

  useEffect(() => {
    getConfig(slug)
      .then(d => {
        if (d.business_name) setSiteName(d.business_name)
        if (d.site_emoji) setSiteEmoji(d.site_emoji)
        if (d.brand_color) document.documentElement.style.setProperty('--brand', d.brand_color)
      })
      .catch(() => {})
  }, [slug])

  return (
    <>
      <nav className="navbar">
        <Link to={homeHref} className="brand">{siteEmoji} {siteName}</Link>
        <div className="nav-links">
          <Link to={homeHref}>Home</Link>
          <Link to="/chat">Ask Us</Link>
          <a href={MOBILE_APP_URL} target="_blank" rel="noreferrer">Open the App</a>
          <Link to="/setup">Owner Setup</Link>
          <Link to="/admin">Admin</Link>
        </div>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<Storefront />} />
          <Route path="/t/:slug" element={<Storefront />} />
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
