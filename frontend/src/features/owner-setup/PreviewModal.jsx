import { useEffect } from 'react'

// Renders straight from the setup form's current in-memory `config` — no
// network call, no save — so someone can see what their storefront will
// look like while they're still trying things out, before ever paying for
// admin access to actually publish it.
export default function PreviewModal({ config, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const activeModes = (config.mode_config || []).filter(m => m.active)
  const heroPhoto = config.hero_photos?.[0]
  // Scoped to this modal only (inline style on a wrapper), not the page's
  // <html> element — previewing colours shouldn't repaint the setup form
  // you're still editing behind it.
  const themeVars = {
    '--accent': config.brand_color || '#e8843c',
    ...(config.banner_color ? { '--banner': config.banner_color } : {}),
    ...(config.background_color ? { '--bg': config.background_color } : {}),
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <strong style={{ fontSize: '0.9rem', color: '#555' }}>
            👁️ Preview — this is what visitors will see. Nothing is public yet.
          </strong>
          <button onClick={onClose} style={closeBtnStyle}>✕ Close</button>
        </div>

        <div style={{ ...themeVars, overflow: 'auto', flex: 1, background: 'var(--bg, #fff)' }}>
          <div
            className="hero"
            style={heroPhoto ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${heroPhoto})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: '#fff',
            } : {}}
          >
            <h1 style={heroPhoto ? { color: '#fff' } : {}}>{config.site_emoji || '🐾'} {config.business_name || 'Your Business'}</h1>
            <p style={heroPhoto ? { color: 'rgba(255,255,255,0.9)' } : {}}>{config.tagline || 'Your tagline goes here.'}</p>
          </div>

          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <div className="filter-bar">
              <button className="btn filter-btn filter-btn--active">✨ All</button>
              {activeModes.map(m => (
                <button key={m.key} className="btn filter-btn">{m.emoji} {m.label}</button>
              ))}
            </div>

            {activeModes.length === 0 ? (
              <p style={{ color: '#999' }}>Enable at least one category above to see sample listing cards here.</p>
            ) : (
              <div className="grid">
                {activeModes.map(m => (
                  <div className="card" key={m.key}>
                    {m.image && <img src={m.image} alt="" />}
                    <div className="card-body">
                      <span className="tag" style={{ background: 'var(--accent)' }}>{m.label}</span>
                      <h3>Sample {m.label} listing</h3>
                      <p style={{ color: '#777' }}>{m.subtitle || 'Real listings will show up here once your app is live.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }
const panelStyle = { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 1rem', borderBottom: '1px solid #eee', background: '#fafafa', flexShrink: 0 }
const closeBtnStyle = { border: '1px solid #ddd', background: '#fff', borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }
