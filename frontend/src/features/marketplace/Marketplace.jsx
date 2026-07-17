import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMarketplace, getAdminToken, getMyConfig } from '../../api/client'

const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || 'http://localhost:8081'

function BusinessCard({ biz, isMine }) {
  const siteHref = biz.slug ? `/t/${biz.slug}` : '/'
  // /reset-tenant (not a bare link) for the default tenant — otherwise
  // opening the app would silently keep showing whichever tenant was last
  // joined on that device instead of landing on this one.
  const appHref = `${MOBILE_APP_URL}${biz.slug ? `/t/${biz.slug}` : '/reset-tenant'}`
  return (
    <div className="card" style={{ overflow: 'visible' }}>
      <div
        style={{
          height: 90,
          background: biz.hero_photo
            ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${biz.hero_photo}) center/cover`
            : (biz.brand_color || '#e8843c'),
        }}
      />
      <div className="card-body">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>{biz.site_emoji}</span> {biz.business_name}
        </h3>
        <p style={{ marginBottom: '1rem', color: '#666' }}>{biz.tagline}</p>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link to={siteHref} className="btn btn--outline" style={{ marginTop: 0, textDecoration: 'none', display: 'inline-block' }}>
            Visit site
          </Link>
          <a
            href={appHref}
            target="_blank"
            rel="noreferrer"
            className="btn"
            style={{ marginTop: 0, backgroundColor: biz.brand_color || '#e8843c', textDecoration: 'none', display: 'inline-block' }}
          >
            {isMine ? 'Open Your App' : 'Open the app'}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Marketplace() {
  const [businesses, setBusinesses] = useState(null)
  const [mySlug, setMySlug] = useState(undefined)

  useEffect(() => {
    document.title = 'App Marketplace — TownHubs'
    getMarketplace().then(setBusinesses).catch(() => setBusinesses([]))
    if (getAdminToken()) {
      getMyConfig().then(d => setMySlug(d.slug ?? null)).catch(() => {})
    }
  }, [])

  return (
    <div>
      <div className="hero">
        <h1>App Marketplace</h1>
        <p>Browse businesses running on this platform, or set up your own app in minutes.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <Link to="/setup" className="btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          🚀 Setup Your App →
        </Link>
      </div>

      {businesses === null && <p style={{ color: '#555' }}>Loading…</p>}
      {businesses?.length === 0 && <p style={{ color: '#555' }}>No businesses listed yet.</p>}

      <div className="grid">
        {businesses?.map(biz => (
          <BusinessCard key={biz.slug || 'default'} biz={biz} isMine={mySlug !== undefined && (biz.slug ?? null) === mySlug} />
        ))}
      </div>
    </div>
  )
}
