import { useEffect, useState } from 'react'
import { getMyConfig, updateConfig, uploadConfigPhotos, getAdminToken } from '../../api/client'
import AdminLoginGate, { useAdminAuth } from '../admin-auth/AdminLoginGate'

const DEFAULT_MODES = [
  { key: 'pet',                 active: true, emoji: '🐾', label: 'Adopt / Foster',   subtitle: 'Give a pet a loving home', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=300&fit=crop' },
  { key: 'service',             active: true, emoji: '🦮', label: 'Pet Services',     subtitle: 'Trusted care near you',    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=300&fit=crop' },
  { key: 'event',               active: true, emoji: '🎉', label: 'Pet Events',       subtitle: 'Join the community',       image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop' },
  { key: 'stall',               active: true, emoji: '🛍️', label: 'Stalls & Shops',   subtitle: 'Discover pet products',    image: 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&h=300&fit=crop' },
  { key: 'lost_found',          active: true, emoji: '🔍', label: 'Lost & Found',     subtitle: 'Help reunite pets',        image: 'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=600&h=300&fit=crop' },
  { key: 'hike',                active: true, emoji: '🥾', label: 'Group Hikes',      subtitle: 'Join the community',       image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop' },
  { key: 'petting_zoo_booking', active: true, emoji: '🐑', label: 'Mini Petting Zoo', subtitle: 'Join the community',       image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop' },
]

// Namespaced by admin token (not a flat key) — otherwise switching between
// tenants in the same browser (e.g. master password vs. a real admin token)
// would flash the PREVIOUS tenant's cached business name/config on load,
// which is the exact cross-tenant-leak bug this whole change fixes, just
// re-introduced client-side via a shared cache key.
function cacheKey() {
  return `owner_config_cache:${getAdminToken() || 'none'}`
}

function mergeConfig(data) {
  const existing = data.mode_config || []
  const merged = DEFAULT_MODES.map(def => {
    const found = existing.find(m => m.key === def.key)
    // Spread def first so a category saved before `subtitle` existed still
    // gets a sensible fallback instead of an empty field in the editor.
    return found ? { ...def, ...found } : def
  })
  return { ...data, site_emoji: data.site_emoji ?? '🐾', mode_config: merged }
}

function readCache() {
  try {
    const raw = localStorage.getItem(cacheKey())
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeCache(data) {
  try { localStorage.setItem(cacheKey(), JSON.stringify(data)) } catch {}
}

const BRAND_COLORS = [
  { label: 'Orange',  value: '#e8843c' },
  { label: 'Teal',    value: '#0d9488' },
  { label: 'Indigo',  value: '#4f46e5' },
  { label: 'Rose',    value: '#e11d48' },
  { label: 'Amber',   value: '#d97706' },
  { label: 'Green',   value: '#16a34a' },
  { label: 'Sky',     value: '#0284c7' },
  { label: 'Purple',  value: '#9333ea' },
]

const BANNER_COLORS = [
  { label: 'Forest',  value: '#2d5a3d' },
  { label: 'Navy',    value: '#1e3a5f' },
  { label: 'Plum',    value: '#4c1d3d' },
  { label: 'Slate',   value: '#334155' },
  { label: 'Rust',    value: '#7c2d12' },
  { label: 'Charcoal', value: '#27272a' },
]

const BACKGROUND_COLORS = [
  { label: 'Sage',    value: '#a8d4b8' },
  { label: 'Cream',   value: '#f5f1e8' },
  { label: 'Blush',   value: '#fbe4e6' },
  { label: 'Sky',     value: '#dbeafe' },
  { label: 'Sand',    value: '#ede4d3' },
  { label: 'Lavender', value: '#e6e0f5' },
]

// Shared swatch picker for the three colour fields below. `allowClear` lets
// the optional fields (banner/background) fall back to the CSS default
// instead of being forced to pick one of the presets.
function ColorField({ title, hint, colors, value, onChange, allowClear }) {
  return (
    <section style={sectionStyle}>
      <h3 style={headingStyle}>{title}</h3>
      <p style={{ fontSize: '0.85rem', color: '#777', margin: '0 0 1rem' }}>{hint}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {colors.map(c => (
          <button
            key={c.value}
            title={c.label}
            onClick={() => onChange(c.value)}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: c.value,
              border: value === c.value ? '3px solid #111' : '2px solid transparent',
              boxShadow: value === c.value ? '0 0 0 2px #fff, 0 0 0 4px #111' : 'none',
              cursor: 'pointer',
            }}
          />
        ))}
        {allowClear && (
          <button
            title="Default"
            onClick={() => onChange('')}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 10px 10px',
              border: !value ? '3px solid #111' : '2px solid transparent',
              boxShadow: !value ? '0 0 0 2px #fff, 0 0 0 4px #111' : 'none',
              cursor: 'pointer',
            }}
          />
        )}
      </div>
      <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.6rem' }}>
        {value ? <>Selected: <span style={{ color: value, fontWeight: 600 }}>{value}</span></> : 'Using the default'}
      </p>
    </section>
  )
}

const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || 'http://localhost:8081'

// Every admin's own isolated site — the link they hand out to their people.
// `slug` is null for the original/default tenant, which just lives at root.
function ShareableLink({ slug }) {
  const [copied, setCopied] = useState(false)
  if (slug === undefined) return null
  const url = `${window.location.origin}${slug ? `/t/${slug}` : '/'}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#fff7f0', border: '1px solid #fcd9b6', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600, flexShrink: 0 }}>🔗 Your site:</span>
      <code style={{ flex: 1, minWidth: 160, fontSize: '0.85rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</code>
      <button onClick={copy} style={{ fontSize: '0.8rem', fontWeight: 600, border: '1px solid #e5e7eb', background: copied ? '#16a34a' : '#fff', color: copied ? '#fff' : '#e8843c', borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

export default function OwnerSetup() {
  const { isAdmin, isTryout, checking, onLogin, onTryout } = useAdminAuth()

  if (checking) return <div style={{ textAlign: 'center', marginTop: '8rem', color: '#9ca3af' }}>Checking access…</div>
  if (!isAdmin) return <AdminLoginGate onLogin={onLogin} onTryout={onTryout} />

  return <OwnerSetupInner isTryout={isTryout} />
}

function OwnerSetupInner({ isTryout }) {
  const [config, setConfig] = useState(() => readCache() ?? mergeConfig({
    business_name: 'Outdoor Hounds',
    site_emoji: '🐾',
    tagline: 'Adopt a friend, join a hike, book a service.',
    chat_greeting: '',
    chat_placeholder: '',
    chat_disclaimer: '',
    mode_config: [],
    hero_photos: [],
    brand_color: '#e8843c',
    banner_color: '',
    background_color: '',
  }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingModeKey, setUploadingModeKey] = useState(null)

  useEffect(() => {
    getMyConfig().then(data => {
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

  const handleModeImageUpload = async (key, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingModeKey(key)
    try {
      const { urls } = await uploadConfigPhotos([file])
      if (urls?.[0]) updateMode(key, 'image', urls[0])
    } finally {
      setUploadingModeKey(null)
    }
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
        site_emoji: config.site_emoji,
        tagline: config.tagline,
        chat_greeting: config.chat_greeting,
        chat_placeholder: config.chat_placeholder,
        chat_disclaimer: config.chat_disclaimer,
        mode_config: config.mode_config,
        hero_photos: config.hero_photos,
        brand_color: config.brand_color,
        banner_color: config.banner_color || null,
        background_color: config.background_color || null,
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
      {isTryout && (
        <div style={{ background: '#fff7f0', border: '1px solid #fcd9b6', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
            👀 <strong>Preview mode</strong> — explore the settings but saving is locked.
          </span>
          <a href={`${MOBILE_APP_URL}/admin-subscribe`} target="_blank" rel="noreferrer"
            style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e8843c', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Unlock for $5 →
          </a>
        </div>
      )}
      <h2 style={{ marginBottom: '0.25rem' }}>Owner Setup</h2>
      <p style={{ color: '#777', marginBottom: '1.5rem' }}>
        Customise your site name, categories, and photos. Works for any community — not just pets.
      </p>

      <ShareableLink slug={config.slug} />

      {/* Business name */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Site name</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            value={config.site_emoji}
            onChange={e => setConfig({ ...config, site_emoji: e.target.value })}
            style={{ width: 56, textAlign: 'center', fontSize: '1.6rem', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px', background: 'white', flexShrink: 0 }}
            maxLength={4}
          />
          <input style={{ ...inputStyle, flex: 1 }} value={config.business_name}
            onChange={e => setConfig({ ...config, business_name: e.target.value })}
            placeholder="e.g. Peak Trails Collective" />
        </div>
        <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.4rem' }}>
          Emoji shows in the browser tab and next to your site title.
        </p>
      </section>

      {/* Tagline */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Tagline</h3>
        <input style={inputStyle} value={config.tagline}
          onChange={e => setConfig({ ...config, tagline: e.target.value })}
          placeholder="e.g. Find your next adventure or join a group" />
      </section>

      {/* Colours */}
      <ColorField
        title="Accent colour"
        hint="Buttons, price tags, the selected filter, and enquiry forms across your storefront."
        colors={BRAND_COLORS}
        value={config.brand_color}
        onChange={v => setConfig({ ...config, brand_color: v })}
      />
      <ColorField
        title="Banner colour"
        hint="Background of the header at the top of your storefront, behind your business name and tagline."
        colors={BANNER_COLORS}
        value={config.banner_color}
        onChange={v => setConfig({ ...config, banner_color: v })}
        allowClear
      />
      <ColorField
        title="Page background"
        hint="Background colour behind your listing cards, for the rest of the page below the banner."
        colors={BACKGROUND_COLORS}
        value={config.background_color}
        onChange={v => setConfig({ ...config, background_color: v })}
        allowClear
      />

      {/* Mode config */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Categories</h3>
        <p style={{ fontSize: '0.85rem', color: '#777', margin: '0 0 1.25rem' }}>
          Toggle each category on or off, then rename it and pick an emoji to match your brand.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {config.mode_config.map(mode => (
            <div key={mode.key} style={{
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
              padding: '0.75rem 1rem', borderRadius: 10,
              border: `1.5px solid ${mode.active ? '#e8843c' : '#e5e7eb'}`,
              backgroundColor: mode.active ? '#fff7f0' : '#fafafa',
              opacity: mode.active ? 1 : 0.65,
              transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

              {/* Subtitle — the short line shown under the category name on the mobile app's cards */}
              <input
                value={mode.subtitle ?? ''}
                onChange={e => updateMode(mode.key, 'subtitle', e.target.value)}
                placeholder="Short description shown under the name"
                style={{
                  ...inputStyle, margin: 0, marginLeft: 90, width: 'calc(100% - 90px)', fontSize: '0.8rem',
                  padding: '0.4rem 0.65rem', color: '#777',
                }}
                disabled={!mode.active}
              />

              {/* Card photo — background image behind the label on the mobile app's cards */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 90 }}>
                {mode.image && (
                  <img src={mode.image} alt="" style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb', flexShrink: 0 }} />
                )}
                <label style={{
                  fontSize: '0.78rem', fontWeight: 600, color: '#e8843c', cursor: mode.active ? 'pointer' : 'default',
                  border: '1px solid #fcd9b6', borderRadius: 8, padding: '0.3rem 0.6rem',
                  opacity: (!mode.active || uploadingModeKey === mode.key) ? 0.5 : 1,
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={!mode.active || uploadingModeKey === mode.key}
                    onChange={e => handleModeImageUpload(mode.key, e)}
                  />
                  {uploadingModeKey === mode.key ? 'Uploading…' : mode.image ? 'Change photo' : 'Add photo'}
                </label>
              </div>
            </div>
          ))}
        </div>
        {!hasActive && (
          <p style={{ color: '#c00', fontSize: '0.85rem', marginTop: '0.5rem' }}>Enable at least one category.</p>
        )}
      </section>

      {/* Chat assistant */}
      <section style={sectionStyle}>
        <h3 style={headingStyle}>Chat assistant</h3>
        <p style={{ fontSize: '0.85rem', color: '#777', margin: '0 0 1rem' }}>
          Customise what your "Ask Us" assistant says. Leave blank to use the defaults.
        </p>

        <label style={labelStyle}>Opening greeting</label>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          value={config.chat_greeting || ''}
          onChange={e => setConfig({ ...config, chat_greeting: e.target.value })}
          placeholder={`e.g. Hi! I'm the ${config.business_name} assistant. Ask me anything about our listings.`}
        />

        <label style={{ ...labelStyle, marginTop: '0.9rem' }}>Input placeholder text</label>
        <input
          style={inputStyle}
          value={config.chat_placeholder || ''}
          onChange={e => setConfig({ ...config, chat_placeholder: e.target.value })}
          placeholder="e.g. Ask about our hikes, pets or services…"
        />

        <label style={{ ...labelStyle, marginTop: '0.9rem' }}>Disclaimer / footer note</label>
        <textarea
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
          value={config.chat_disclaimer || ''}
          onChange={e => setConfig({ ...config, chat_disclaimer: e.target.value })}
          placeholder="e.g. This assistant can't confirm bookings — contact us directly to arrange."
        />
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
        {isTryout ? (
          <a href={`${MOBILE_APP_URL}/admin-subscribe`} target="_blank" rel="noreferrer"
            style={{ textDecoration: 'none' }}
            title="Pay $5 to unlock saving">
            <button className="btn" disabled style={{ backgroundColor: '#9ca3af', color: '#fff', border: 'none', cursor: 'not-allowed', opacity: 0.55 }}>
              🔒 Save & Publish
            </button>
          </a>
        ) : (
          <button className="btn" onClick={save} disabled={saving || !hasActive}
            style={{ backgroundColor: '#e8843c', color: '#fff', border: 'none', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save & Publish'}
          </button>
        )}
        {saved && <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Saved — storefront updated</span>}
      </div>
    </div>
  )
}

const sectionStyle = { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f0ece4' }
const headingStyle = { fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#2c2c2c' }
const inputStyle = { width: '100%', padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }
