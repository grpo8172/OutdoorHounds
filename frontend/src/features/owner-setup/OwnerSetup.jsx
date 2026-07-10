import { useEffect, useState } from 'react'
import { getConfig, updateConfig, uploadConfigPhotos } from '../../api/client'

const DEFAULT_MODES = [
  { key: 'pet',                 active: true, emoji: '🐾', label: 'Adopt / Foster' },
  { key: 'service',             active: true, emoji: '🦮', label: 'Pet Services' },
  { key: 'event',               active: true, emoji: '🎉', label: 'Pet Events' },
  { key: 'stall',               active: true, emoji: '🛍️', label: 'Stalls & Shops' },
  { key: 'lost_found',          active: true, emoji: '🔍', label: 'Lost & Found' },
  { key: 'hike',                active: true, emoji: '🥾', label: 'Group Hikes' },
  { key: 'petting_zoo_booking', active: true, emoji: '🐑', label: 'Mini Petting Zoo' },
]

const CACHE_KEY = 'owner_config_cache'

function mergeConfig(data) {
  const existing = data.mode_config || []
  const merged = DEFAULT_MODES.map(def => {
    const found = existing.find(m => m.key === def.key)
    return found || def
  })
  return { ...data, mode_config: merged }
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
}

export default function OwnerSetup() {
  const [config, setConfig] = useState(() => readCache() ?? mergeConfig({
    business_name: 'Outdoor Hounds',
    tagline: 'Adopt a friend, join a hike, book a service.',
    mode_config: [],
    hero_photos: [],
  }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    getConfig().then(data => {
      const merged = mergeConfig(data)
      setConfig(merged)
      writeCache(merged)
    }).catch(() => {})
  }, [])

  const updateMode = (key, field, value) => {
    setConfig({
      ...config,
      mode_config: config.mode_config.map(m => m.key === key ? { ...m, [field]: value } : m),
    })
  }

  const removePhoto = (url) => {
    setConfig({ ...config, hero_photos: config.hero_photos.filter(p => p !== url) })
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      const { urls } = await uploadConfigPhotos(files)
      setConfig({ ...config, hero_photos: [...config.hero_photos, ...urls].slice(0, 6) })
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updateConfig({
        business_name: config.business_name,
        tagline: config.tagline,
        mode_config: config.mode_config,
        hero_photos: config.hero_photos,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const hasActive = config.mode_config.some(m => m.active)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '0.25rem' }}>Owner Setup</h2>
      <p style={{ color: '#777', marginBottom: '2rem' }}>
        Customise your site name, categories, and photos. Works for any community — not just pets.
      </p>

      {/* Business name */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Site name</h3>
        <input style={inputStyle} value={config.business_name}
          onChange={e => setConfig({ ...config, business_name: e.target.value })}
          placeholder="e.g. Peak Trails Collective" />
      </section>

      {/* Tagline */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Tagline</h3>
        <input style={inputStyle} value={config.tagline}
          onChange={e => setConfig({ ...config, tagline: e.target.value })}
          placeholder="e.g. Find your next adventure or join a group" />
      </section>

      {/* Mode config */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Categories</h3>
        <p style={{ fontSize: '0.85rem', color: '#777', margin: '0 0 1.25rem' }}>
          Toggle each category on or off, then rename it and pick an emoji to match your brand.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {config.mode_config.map(mode => (
            <div key={mode.key} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: 10,
              border: `1.5px solid ${mode.active ? '#e8843c' : '#e5e7eb'}`,
              backgroundColor: mode.active ? '#fff7f0' : '#fafafa',
              opacity: mode.active ? 1 : 0.65,
              transition: 'all 0.15s',
            }}>
              {/* Toggle */}
              <input
                type="checkbox"
                checked={mode.active}
                onChange={e => updateMode(mode.key, 'active', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#e8843c', cursor: 'pointer', flexShrink: 0 }}
              />

              {/* Emoji */}
              <input
                value={mode.emoji}
                onChange={e => updateMode(mode.key, 'emoji', e.target.value)}
                style={{
                  width: 48, textAlign: 'center', fontSize: '1.4rem',
                  border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px',
                  background: 'white', flexShrink: 0,
                }}
                maxLength={4}
              />

              {/* Label */}
              <input
                value={mode.label}
                onChange={e => updateMode(mode.key, 'label', e.target.value)}
                placeholder="Category name"
                style={{ ...inputStyle, margin: 0, flex: 1, fontSize: '0.9rem', padding: '0.45rem 0.75rem' }}
                disabled={!mode.active}
              />
            </div>
          ))}
        </div>
        {!hasActive && (
          <p style={{ color: '#c00', fontSize: '0.85rem', marginTop: '0.5rem' }}>Enable at least one category.</p>
        )}
      </section>

      {/* Hero photos */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>
          Hero photos <span style={{ color: '#aaa', fontWeight: 400 }}>({config.hero_photos.length}/6)</span>
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#777', margin: '0 0 1rem' }}>
          The first photo becomes the storefront background. Leave empty for a plain header.
        </p>

        {config.hero_photos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            {config.hero_photos.map((url, i) => (
              <div key={url} style={{ position: 'relative' }}>
                <img src={url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: i === 0 ? '3px solid #e8843c' : '1px solid #ddd' }} />
                {i === 0 && <span style={{ position: 'absolute', bottom: 4, left: 4, background: '#e8843c', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 4 }}>Main</span>}
                <button onClick={() => removePhoto(url)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, lineHeight: '20px', textAlign: 'center' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {config.hero_photos.length < 6 && (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: '2px dashed #ddd', borderRadius: 12, padding: '1.25rem', cursor: uploading ? 'default' : 'pointer', color: '#aaa' }}>
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploading} />
            {uploading ? <span>Uploading…</span> : <>
              <span style={{ fontSize: 28 }}>📸</span>
              <span style={{ color: '#e8843c', fontWeight: 600 }}>Add hero photos</span>
              <span style={{ fontSize: 12 }}>Click to browse — up to 6 total</span>
            </>}
          </label>
        )}
      </section>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn" onClick={save} disabled={saving || !hasActive}
          style={{ backgroundColor: '#e8843c', color: '#fff', border: 'none', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save & Publish'}
        </button>
        {saved && <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Saved — storefront updated</span>}
      </div>
    </div>
  )
}

const sectionStyle = { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f0ece4' }
const headingStyle = { fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#2c2c2c' }
const inputStyle = { width: '100%', padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box' }
