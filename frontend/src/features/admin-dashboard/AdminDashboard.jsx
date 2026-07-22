import { useEffect, useState, useMemo, createContext, useContext } from 'react'
import { getAuditEvents, getPendingItems, approveItem, getEnquiries, decideEnquiry, reproposeEnquiry, getMyItems, getMyConfig, addListing, updateListing, uploadConfigPhotos } from '../../api/client'
import AdminLoginGate, { useAdminAuth } from '../admin-auth/AdminLoginGate'

const TYPE_LABELS = {
  pet: 'Adopt / Foster', hike: 'Group Hike', service: 'Pet Services',
  petting_zoo_booking: 'Petting Zoo', event: 'Pet Event',
  stall: 'Stall / Shop', lost_found: 'Lost & Found',
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Every tenant runs on the same admin dashboard UI, but each one styles it
// with their own brand color (set in Owner Setup) so it reads as "their"
// business rather than a generic shared tool. AI-proposed styling (amber
// dashed badges) stays fixed regardless of brand color — that's a status
// indicator, not a brand accent.
const BrandColorContext = createContext('#e8843c')
const AI_ACCENT = '#e8843c'

// ── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({ bookings, items }) {
  const brandColor = useContext(BrandColorContext)
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null)

  const itemMap = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])

  const byDay = useMemo(() => {
    const map = {}
    bookings
      .map(b => ({ ...b, _date: b.status === 'approved' ? b.booking_date : b.proposed_date }))
      .filter(b => (b.status === 'approved' || b.status === 'ai_proposed') && b._date)
      .forEach(b => {
        const d = new Date(b._date + 'T00:00:00')
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate()
          if (!map[day]) map[day] = []
          map[day].push(b)
        }
      })
    return map
  }, [bookings, year, month])

  const totalDays = new Date(year, month + 1, 0).getDate()
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = d => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <button onClick={() => month === 0 ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1)} style={navBtnStyle}>‹</button>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, minWidth: 160, textAlign: 'center' }}>{MONTHS[month]} {year}</h3>
        <button onClick={() => month === 11 ? (setMonth(0), setYear(y => y+1)) : setMonth(m => m+1)} style={navBtnStyle}>›</button>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#9ca3af' }}>
          {Object.values(byDay).flat().length} booking{Object.values(byDay).flat().length !== 1 ? 's' : ''} this month
        </span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
        {DAY_HEADERS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          const dayBookings = day ? (byDay[day] || []) : []
          return (
            <div
              key={i}
              onClick={() => day && dayBookings.length && setSelected(selected === day ? null : day)}
              style={{
                minHeight: 80,
                borderRadius: 8,
                border: `1.5px solid ${day && isToday(day) ? brandColor : '#e5e7eb'}`,
                backgroundColor: day ? (isToday(day) ? '#fff7f0' : '#fff') : '#f9fafb',
                padding: '6px 5px',
                cursor: day && dayBookings.length ? 'pointer' : 'default',
                transition: 'box-shadow 0.1s',
                boxShadow: selected === day ? `0 0 0 2px ${brandColor}` : 'none',
              }}
            >
              {day && (
                <>
                  <div style={{ fontSize: '0.78rem', fontWeight: isToday(day) ? 700 : 500, color: isToday(day) ? brandColor : '#374151', marginBottom: 3 }}>{day}</div>
                  {dayBookings.map(b => (
                    <div key={b.id} style={{
                      fontSize: '0.65rem',
                      background: b.status === 'ai_proposed' ? '#fde4cc' : brandColor,
                      color: b.status === 'ai_proposed' ? '#92400e' : '#fff',
                      border: b.status === 'ai_proposed' ? `1px dashed ${AI_ACCENT}` : 'none',
                      borderRadius: 4, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}
                      title={`${itemMap[b.item_id]?.name || b.message}${b.status === 'ai_proposed' ? ' — AI proposed, awaiting approval' : ''}`}>
                      {b.status === 'ai_proposed' ? '🤖 ' : ''}{itemMap[b.item_id]?.name || `#${b.id}`}
                    </div>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selected && byDay[selected] && (
        <div style={{ marginTop: '1rem', background: '#fff7f0', border: `1px solid ${brandColor}`, borderRadius: 12, padding: '1rem' }}>
          <strong style={{ color: brandColor }}>{MONTHS[month]} {selected} — {byDay[selected].length} booking{byDay[selected].length !== 1 ? 's' : ''}</strong>
          {byDay[selected].map(b => (
            <div key={b.id} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #fde4cc' }}>
              <div style={{ fontWeight: 600 }}>{itemMap[b.item_id]?.name || 'Listing'}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 2 }}>{b.message}</div>
              {b.status === 'ai_proposed' && (
                <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: 4 }}>
                  🤖 AI proposed — awaiting your approval {typeof b.ai_confidence === 'number' ? `(${b.ai_confidence}% confidence)` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Approve modal ─────────────────────────────────────────────────────────────

function ApproveModal({ enquiry, itemName, onConfirm, onCancel }) {
  const brandColor = useContext(BrandColorContext)
  const [date, setDate] = useState(enquiry.proposed_date || '')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Approve booking</h3>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1rem' }}>
          <strong>{itemName}</strong><br />"{enquiry.message}"
        </p>
        {enquiry.proposed_date && (
          <div style={{ background: '#fff7f0', border: '1px solid #fcd9b6', borderRadius: 10, padding: '0.6rem 0.75rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#92400e' }}>
            🤖 AI proposed <strong>{enquiry.proposed_date}{enquiry.proposed_time ? ` at ${enquiry.proposed_time}` : ''}</strong>
            {typeof enquiry.ai_confidence === 'number' && ` (${enquiry.ai_confidence}% confidence)`}
            {enquiry.ai_reasoning && <div style={{ marginTop: 3, fontStyle: 'italic' }}>{enquiry.ai_reasoning}</div>}
          </div>
        )}
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
          Booking date {enquiry.proposed_date ? '(override AI proposal if needed)' : '(optional)'}
        </label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" style={{ flex: 1, background: brandColor }} onClick={() => onConfirm(date || null)}>Approve</button>
          <button className="btn btn--outline" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

const EVENT_LABELS = {
  storefront_viewed: { label: 'Page view', emoji: '👁️' },
  enquiry_intent:    { label: 'Enquiry button clicked', emoji: '💬' },
  enquiry_submitted: { label: 'Enquiry sent', emoji: '✉️' },
  enquiry_created:   { label: 'Enquiry received', emoji: '📥' },
  ai_booking_proposed: { label: 'AI proposed a booking', emoji: '🤖' },
  enquiry_decided:   { label: 'Enquiry decided', emoji: '✅' },
  item_viewed:       { label: 'Listing viewed', emoji: '🔍' },
  item_proposed:     { label: 'Listing submitted', emoji: '📝' },
  item_approved:     { label: 'Listing approved', emoji: '🚀' },
  config_updated:    { label: 'Settings saved', emoji: '⚙️' },
}

const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || 'http://localhost:8081'

export default function AdminDashboard() {
  const { isAdmin, isTryout, checking, logout, onLogin, onTryout } = useAdminAuth()

  if (checking) return <div style={{ textAlign: 'center', marginTop: '8rem', color: '#9ca3af' }}>Checking access…</div>
  if (!isAdmin) return <AdminLoginGate onLogin={onLogin} onTryout={onTryout} />

  return <AdminDashboardInner onLogout={logout} isTryout={isTryout} />
}

function TryoutBanner() {
  const brandColor = useContext(BrandColorContext)
  return (
    <div style={{ background: '#fff7f0', border: '1px solid #fcd9b6', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
        👀 <strong>Preview mode</strong> — you can explore but write actions are locked.
      </span>
      <a href={`${MOBILE_APP_URL}/admin-subscribe`} target="_blank" rel="noreferrer"
        style={{ fontSize: '0.85rem', fontWeight: 600, color: brandColor, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Unlock for $5 →
      </a>
    </div>
  )
}

function LockedButton({ label, style }) {
  return (
    <a href={`${MOBILE_APP_URL}/admin-subscribe`} target="_blank" rel="noreferrer"
      title="Pay $5 to unlock admin actions"
      style={{ display: 'inline-block', opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'auto', textDecoration: 'none', ...style }}
      onClick={e => { e.preventDefault(); window.open(`${MOBILE_APP_URL}/admin-subscribe`, '_blank') }}>
      <span className="btn" style={{ background: '#9ca3af', pointerEvents: 'none' }}>🔒 {label}</span>
    </a>
  )
}

// Every admin's own isolated site — the link they hand out to their people.
// `slug` is null for the original/default tenant, which just lives at root.
function ShareableLink({ slug }) {
  const brandColor = useContext(BrandColorContext)
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#fff7f0', border: '1px solid #fcd9b6', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600, flexShrink: 0 }}>🔗 Your site:</span>
      <code style={{ flex: 1, minWidth: 160, fontSize: '0.85rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</code>
      <button onClick={copy} style={{ fontSize: '0.8rem', fontWeight: 600, border: '1px solid #e5e7eb', background: copied ? '#16a34a' : '#fff', color: copied ? '#fff' : brandColor, borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

const EMPTY_LISTING = { item_type: 'pet', name: '', description: '', price: '', image_url: '', cta_label: '' }

// Lets a new tenant (whose site starts empty — the mobile app has no
// concept of which tenant a listing belongs to yet) populate their own
// storefront directly, without waiting on a customer to propose something.
function AddListingForm({ onAdded, modeConfig }) {
  const brandColor = useContext(BrandColorContext)
  // Prefer the tenant's own configured categories (set in Owner Setup) over
  // the universal pet-marketplace list, so e.g. an art portfolio tenant sees
  // their own renamed categories instead of "Pet Services".
  const categories = modeConfig?.length
    ? modeConfig.filter(m => m.active)
    : Object.entries(TYPE_LABELS).map(([key, label]) => ({ key, label }))
  const [form, setForm] = useState(EMPTY_LISTING)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (categories.length && !categories.some(c => c.key === form.item_type)) {
      setForm(f => ({ ...f, item_type: categories[0].key }))
    }
  }, [modeConfig]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { urls } = await uploadConfigPhotos([file])
      if (urls?.[0]) setForm(f => ({ ...f, image_url: urls[0] }))
    } catch {
      setError('Could not upload the photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.description.trim()) return
    setSaving(true)
    setError(null)
    try {
      await addListing({
        item_type: form.item_type,
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price.trim() || null,
        image_url: form.image_url.trim() || null,
        cta_label: form.cta_label.trim() || null,
      })
      setForm({ ...EMPTY_LISTING, item_type: categories[0]?.key || 'pet' })
      onAdded()
    } catch {
      setError('Could not add the listing. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Category</label>
        <select value={form.item_type} onChange={set('item_type')} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem' }}>
          {categories.map(({ key, label, emoji }) => <option key={key} value={key}>{emoji ? `${emoji} ` : ''}{label}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Title *</label>
        <input value={form.name} onChange={set('name')} placeholder="e.g. Max — 3yr Golden Retriever"
          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Description *</label>
        <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Tell people about this listing…"
          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Price (optional)</label>
        <input value={form.price} onChange={set('price')} placeholder="e.g. Free, $25/walk"
          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Button text (optional)</label>
        <input value={form.cta_label} onChange={set('cta_label')} placeholder={categories.find(c => c.key === form.item_type)?.cta_label || 'Enquire'}
          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0.3rem 0 0' }}>Leave blank to use this category's default button text — just this listing.</p>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Photo (optional)</label>
        {form.image_url && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.6rem' }}>
            <img src={form.image_url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
            <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
              style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, lineHeight: '20px', textAlign: 'center' }}>✕</button>
          </div>
        )}
        {!form.image_url && (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: '2px dashed #ddd', borderRadius: 12, padding: '1rem', cursor: uploading ? 'default' : 'pointer', color: '#aaa', marginBottom: '0.6rem' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploading} />
            {uploading ? <span>Uploading…</span> : <>
              <span style={{ fontSize: 22 }}>📸</span>
              <span style={{ color: brandColor, fontWeight: 600, fontSize: '0.85rem' }}>Upload a photo</span>
            </>}
          </label>
        )}
        <input value={form.image_url} onChange={set('image_url')} placeholder="…or paste an image URL"
          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={saving || !form.name.trim() || !form.description.trim()} className="btn"
        style={{ background: brandColor, alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Adding…' : 'Add Listing'}
      </button>
    </form>
  )
}

// Edits a single existing listing (pending or published) — the only place
// an admin can change a listing after it's been added, including overriding
// its button text without renaming the whole category.
function EditListingModal({ item, modeConfig, onSaved, onCancel }) {
  const brandColor = useContext(BrandColorContext)
  const categories = modeConfig?.length
    ? modeConfig.filter(m => m.active || m.key === item.item_type)
    : Object.entries(TYPE_LABELS).map(([key, label]) => ({ key, label }))
  const [form, setForm] = useState({
    item_type: item.item_type,
    name: item.name || '',
    description: item.description || '',
    price: item.price || '',
    image_url: item.image_url || '',
    cta_label: item.cta_label || '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { urls } = await uploadConfigPhotos([file])
      if (urls?.[0]) setForm(f => ({ ...f, image_url: urls[0] }))
    } catch {
      setError('Could not upload the photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.description.trim()) return
    setSaving(true)
    setError(null)
    try {
      await updateListing(item.id, {
        item_type: form.item_type,
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price.trim() || null,
        image_url: form.image_url.trim() || null,
        cta_label: form.cta_label.trim() || null,
      })
      onSaved()
    } catch {
      setError('Could not save this listing. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <h3 style={{ margin: 0 }}>Edit listing</h3>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Category</label>
          <select value={form.item_type} onChange={set('item_type')} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem' }}>
            {categories.map(({ key, label, emoji }) => <option key={key} value={key}>{emoji ? `${emoji} ` : ''}{label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Title *</label>
          <input value={form.name} onChange={set('name')}
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Description *</label>
          <textarea value={form.description} onChange={set('description')} rows={3}
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Price (optional)</label>
          <input value={form.price} onChange={set('price')} placeholder="e.g. Free, $25/walk"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Button text (optional)</label>
          <input value={form.cta_label} onChange={set('cta_label')} placeholder={categories.find(c => c.key === form.item_type)?.cta_label || 'Enquire'}
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
          <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0.3rem 0 0' }}>Leave blank to use this category's default button text — just this listing.</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Photo (optional)</label>
          {form.image_url && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.6rem' }}>
              <img src={form.image_url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
              <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, lineHeight: '20px', textAlign: 'center' }}>✕</button>
            </div>
          )}
          {!form.image_url && (
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: '2px dashed #ddd', borderRadius: 12, padding: '1rem', cursor: uploading ? 'default' : 'pointer', color: '#aaa', marginBottom: '0.6rem' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploading} />
              {uploading ? <span>Uploading…</span> : <>
                <span style={{ fontSize: 22 }}>📸</span>
                <span style={{ color: brandColor, fontWeight: 600, fontSize: '0.85rem' }}>Upload a photo</span>
              </>}
            </label>
          )}
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={saving || !form.name.trim() || !form.description.trim()} className="btn"
            style={{ flex: 1, background: brandColor, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn btn--outline" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

function AdminDashboardInner({ onLogout, isTryout }) {
  const [tab, setTab] = useState('listings')
  const [pending, setPending] = useState([])
  const [published, setPublished] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [events, setEvents] = useState([])
  const [approveTarget, setApproveTarget] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [config, setConfig] = useState(undefined)
  const brandColor = config?.brand_color || '#e8843c'

  const load = () => {
    getPendingItems().then(setPending).catch(() => setPending([]))
    getMyItems().then(setPublished).catch(() => setPublished([]))
    getEnquiries().then(setEnquiries).catch(() => setEnquiries([]))
    getAuditEvents().then(setEvents).catch(() => setEvents([]))
    getMyConfig().then(setConfig).catch(() => {})
  }

  useEffect(load, [])

  const approveListing = async (id) => {
    await approveItem(id)
    load()
  }

  const approveEnquiry = async (id, bookingDate) => {
    await decideEnquiry(id, true, bookingDate)
    setApproveTarget(null)
    load()
  }

  const rejectEnquiry = async (id) => {
    await decideEnquiry(id, false)
    load()
  }

  const reproposeAndReload = async (id) => {
    await reproposeEnquiry(id)
    load()
  }

  // Tenant's own category labels (set in Owner Setup) take priority over the
  // universal pet-marketplace ones, same as the public storefront does.
  const typeLabelMap = Object.fromEntries((config?.mode_config ?? []).map(m => [m.key, m.label]))
  const typeLabel = (itemType) => typeLabelMap[itemType] || TYPE_LABELS[itemType] || itemType

  const allItems = [...pending, ...published]
  const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]))
  // "pending" here means the AI agent had no proposal (e.g. GCP not
  // configured yet) — everything the agent could handle already moved to
  // ai_proposed, so this bucket is the manual-scheduling fallback path.
  const pendingEnquiries = enquiries.filter(e => e.status === 'pending')
  const aiProposedEnquiries = enquiries.filter(e => e.status === 'ai_proposed')
  const approvedBookings = enquiries.filter(e => e.status === 'approved')
  const needsAttentionCount = pendingEnquiries.length + aiProposedEnquiries.length

  const TABS = [
    { id: 'listings', label: `Listings${pending.length ? ` (${pending.length} pending)` : ''}` },
    { id: 'add', label: '+ Add Listing' },
    { id: 'enquiries', label: `Enquiries${needsAttentionCount ? ` (${needsAttentionCount})` : ''}` },
    { id: 'calendar', label: 'Calendar' },
    { id: 'activity', label: `Activity${events.length ? ` (${events.length})` : ''}` },
  ]

  return (
    <BrandColorContext.Provider value={brandColor}>
    <div>
      {isTryout && <TryoutBanner />}
      <ShareableLink slug={config?.slug} />
      {approveTarget && (
        <ApproveModal
          enquiry={approveTarget}
          itemName={itemMap[approveTarget.item_id]?.name || 'Listing'}
          onConfirm={date => approveEnquiry(approveTarget.id, date)}
          onCancel={() => setApproveTarget(null)}
        />
      )}
      {editingItem && (
        <EditListingModal
          item={editingItem}
          modeConfig={config?.mode_config}
          onSaved={() => { setEditingItem(null); load() }}
          onCancel={() => setEditingItem(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>
            {config?.site_emoji ? `${config.site_emoji} ` : ''}{config?.business_name || 'Admin Dashboard'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
            Admin Dashboard — approve listings, manage bookings, and view your calendar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <a
            href={`${MOBILE_APP_URL}${config?.slug ? `/t/${config.slug}` : '/reset-tenant'}`}
            target="_blank" rel="noreferrer"
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.9rem', color: brandColor, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            📱 Open Phone App
          </a>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.9rem', color: '#777', cursor: 'pointer', fontSize: '0.85rem' }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        {[
          { label: 'Published', value: published.length, color: '#16a34a' },
          { label: 'Pending listings', value: pending.length, color: brandColor },
          { label: 'AI proposed', value: aiProposedEnquiries.length, color: '#92400e' },
          { label: 'Needs manual review', value: pendingEnquiries.length, color: '#7b5ea7' },
          { label: 'Approved bookings', value: approvedBookings.length, color: '#0ea5e9' },
        ].map(s => (
          <div key={s.label} style={{ flex: '1 1 120px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            background: 'none', borderBottom: `2.5px solid ${tab === t.id ? brandColor : 'transparent'}`,
            color: tab === t.id ? brandColor : '#6b7280',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Listings tab ── */}
      {tab === 'listings' && (
        <div>
          {pending.length > 0 && (
            <>
              <h3 style={sectionHead}>Pending Approval</h3>
              <div className="grid">
                {pending.map(item => (
                  <div className="card" key={item.id}>
                    {item.image_url && <img src={item.image_url} alt={item.name} onError={e => e.target.style.display='none'} />}
                    <div className="card-body">
                      <span className={`tag ${item.item_type}`}>{typeLabel(item.item_type)}</span>
                      <h3>{item.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.description}</p>
                      {item.price && <p style={{ fontWeight: 600, color: brandColor }}>{item.price}</p>}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {isTryout
                          ? <LockedButton label="Approve & Publish" />
                          : <button className="btn" style={{ background: brandColor }} onClick={() => approveListing(item.id)}>Approve & Publish</button>
                        }
                        <button className="btn btn--outline" onClick={() => setEditingItem(item)}>Edit</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 style={{ ...sectionHead, marginTop: pending.length ? '2rem' : 0 }}>Published Listings ({published.length})</h3>
          {published.length === 0
            ? <p style={{ color: '#9ca3af' }}>No published listings yet.</p>
            : (
              <div className="grid">
                {published.map(item => (
                  <div className="card" key={item.id} style={{ opacity: 0.85 }}>
                    {item.image_url && <img src={item.image_url} alt={item.name} onError={e => e.target.style.display='none'} />}
                    <div className="card-body">
                      <span className={`tag ${item.item_type}`}>{typeLabel(item.item_type)}</span>
                      <h3>{item.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.description}</p>
                      {item.price && <p style={{ fontWeight: 600, color: brandColor }}>{item.price}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Live</span>
                        <button className="btn btn--outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }} onClick={() => setEditingItem(item)}>Edit</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── Add Listing tab ── */}
      {tab === 'add' && (
        <div>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Adds directly to your storefront — no approval step, since it's coming from you.
          </p>
          {isTryout ? (
            <LockedButton label="Add Listing" />
          ) : (
            <AddListingForm onAdded={() => { load(); setTab('listings') }} modeConfig={config?.mode_config} />
          )}
        </div>
      )}

      {/* ── Enquiries tab ── */}
      {tab === 'enquiries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pendingEnquiries.length === 0 && aiProposedEnquiries.length === 0 && approvedBookings.length === 0 && (
            <p style={{ color: '#9ca3af' }}>No enquiries yet.</p>
          )}

          {aiProposedEnquiries.length > 0 && (
            <>
              <h3 style={sectionHead}>🤖 AI Proposed — Awaiting Your Approval</h3>
              {aiProposedEnquiries.map(e => (
                <div key={e.id} style={{ ...enquiryCard, borderColor: '#fcd9b6', background: '#fffaf5' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{itemMap[e.item_id]?.name || `Listing #${e.item_id}`}</div>
                    <div style={{ fontSize: '0.85rem', color: '#374151', margin: '0.3rem 0' }}>"{e.message}"</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>
                      📅 {e.proposed_date}{e.proposed_time ? ` at ${e.proposed_time}` : ''}
                      {typeof e.ai_confidence === 'number' && ` · ${e.ai_confidence}% confidence`}
                    </div>
                    {e.ai_reasoning && <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2, fontStyle: 'italic' }}>{e.ai_reasoning}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'flex-start' }}>
                    {isTryout ? (
                      <LockedButton label="Approve" />
                    ) : (
                      <>
                        <button className="btn" style={{ background: brandColor, fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => setApproveTarget(e)}>Approve</button>
                        <button className="btn btn--outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => reproposeAndReload(e.id)}>Re-run AI</button>
                        <button className="btn btn--outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', color: '#dc2626', borderColor: '#dc2626' }} onClick={() => rejectEnquiry(e.id)}>Decline</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {pendingEnquiries.length > 0 && (
            <>
              <h3 style={{ ...sectionHead, marginTop: aiProposedEnquiries.length ? '1.5rem' : 0 }}>Needs Manual Review</h3>
              {pendingEnquiries.map(e => (
                <div key={e.id} style={enquiryCard}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{itemMap[e.item_id]?.name || `Listing #${e.item_id}`}</div>
                    <div style={{ fontSize: '0.85rem', color: '#374151', margin: '0.3rem 0' }}>"{e.message}"</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'flex-start' }}>
                    {isTryout ? (
                      <LockedButton label="Approve" />
                    ) : (
                      <>
                        <button className="btn" style={{ background: brandColor, fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => setApproveTarget(e)}>Approve</button>
                        <button className="btn btn--outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', color: '#dc2626', borderColor: '#dc2626' }} onClick={() => rejectEnquiry(e.id)}>Decline</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {approvedBookings.length > 0 && (
            <>
              <h3 style={{ ...sectionHead, marginTop: (pendingEnquiries.length || aiProposedEnquiries.length) ? '1.5rem' : 0 }}>Approved Bookings</h3>
              {approvedBookings.map(e => (
                <div key={e.id} style={{ ...enquiryCard, borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{itemMap[e.item_id]?.name || `Listing #${e.item_id}`}</div>
                    <div style={{ fontSize: '0.85rem', color: '#374151', margin: '0.3rem 0' }}>"{e.message}"</div>
                    {e.booking_date && (
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>
                        📅 {new Date(e.booking_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', padding: '0.2rem 0.6rem', background: '#dcfce7', borderRadius: 20 }}>✓ Approved</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Calendar tab ── */}
      {tab === 'calendar' && (
        <div>
          {approvedBookings.filter(b => b.booking_date).length === 0 && aiProposedEnquiries.length === 0 && (
            <div className="banner" style={{ marginBottom: '1.25rem' }}>
              No bookings yet. The AI proposes a date as soon as a customer sends an enquiry — dashed 🤖 entries are awaiting your approval.
            </div>
          )}
          <Calendar bookings={enquiries} items={allItems} />
        </div>
      )}

      {/* ── Activity tab ── */}
      {tab === 'activity' && (
        <div>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Every click, enquiry, and action tracked in real time.
          </p>
          {events.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No activity recorded yet — interactions will appear here once users visit the storefront.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {events.map(e => {
                const meta = EVENT_LABELS[e.event_type] || { label: e.event_type, emoji: '📌' }
                const time = new Date(e.created_at)
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.65rem 1rem' }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1.4 }}>{meta.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{meta.label}</span>
                      {e.details && (
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.5rem' }}>{e.details}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {time.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </div>
    </BrandColorContext.Provider>
  )
}

const sectionHead = { fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#374151' }
const navBtnStyle = { background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, color: '#374151' }
const enquiryCard = { display: 'flex', alignItems: 'flex-start', gap: '1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem' }
