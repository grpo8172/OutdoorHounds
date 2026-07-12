import { useEffect, useState, useMemo } from 'react'
import { getAuditEvents, getPendingItems, approveItem, getEnquiries, decideEnquiry, getMyItems, getMyConfig, addListing } from '../../api/client'
import AdminLoginGate, { useAdminAuth } from '../admin-auth/AdminLoginGate'

const TYPE_LABELS = {
  pet: 'Adopt / Foster', hike: 'Group Hike', service: 'Pet Services',
  petting_zoo_booking: 'Petting Zoo', event: 'Pet Event',
  stall: 'Stall / Shop', lost_found: 'Lost & Found',
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({ bookings, items }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(null)

  const itemMap = useMemo(() => Object.fromEntries(items.map(i => [i.id, i])), [items])

  const byDay = useMemo(() => {
    const map = {}
    bookings.filter(b => b.status === 'approved' && b.booking_date).forEach(b => {
      const d = new Date(b.booking_date + 'T00:00:00')
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
                border: `1.5px solid ${day && isToday(day) ? '#e8843c' : '#e5e7eb'}`,
                backgroundColor: day ? (isToday(day) ? '#fff7f0' : '#fff') : '#f9fafb',
                padding: '6px 5px',
                cursor: day && dayBookings.length ? 'pointer' : 'default',
                transition: 'box-shadow 0.1s',
                boxShadow: selected === day ? '0 0 0 2px #e8843c' : 'none',
              }}
            >
              {day && (
                <>
                  <div style={{ fontSize: '0.78rem', fontWeight: isToday(day) ? 700 : 500, color: isToday(day) ? '#e8843c' : '#374151', marginBottom: 3 }}>{day}</div>
                  {dayBookings.map(b => (
                    <div key={b.id} style={{ fontSize: '0.65rem', background: '#e8843c', color: '#fff', borderRadius: 4, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                      title={itemMap[b.item_id]?.name || b.message}>
                      {itemMap[b.item_id]?.name || `#${b.id}`}
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
        <div style={{ marginTop: '1rem', background: '#fff7f0', border: '1px solid #e8843c', borderRadius: 12, padding: '1rem' }}>
          <strong style={{ color: '#e8843c' }}>{MONTHS[month]} {selected} — {byDay[selected].length} booking{byDay[selected].length !== 1 ? 's' : ''}</strong>
          {byDay[selected].map(b => (
            <div key={b.id} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #fde4cc' }}>
              <div style={{ fontWeight: 600 }}>{itemMap[b.item_id]?.name || 'Listing'}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 2 }}>{b.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Approve modal ─────────────────────────────────────────────────────────────

function ApproveModal({ enquiry, itemName, onConfirm, onCancel }) {
  const [date, setDate] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Approve booking</h3>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1rem' }}>
          <strong>{itemName}</strong><br />"{enquiry.message}"
        </p>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
          Booking date (optional)
        </label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" style={{ flex: 1, background: '#e8843c' }} onClick={() => onConfirm(date || null)}>Approve</button>
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
  return (
    <div style={{ background: '#fff7f0', border: '1px solid #fcd9b6', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
        👀 <strong>Preview mode</strong> — you can explore but write actions are locked.
      </span>
      <a href={`${MOBILE_APP_URL}/admin-subscribe`} target="_blank" rel="noreferrer"
        style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e8843c', textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Unlock for $30 →
      </a>
    </div>
  )
}

function LockedButton({ label, style }) {
  return (
    <a href={`${MOBILE_APP_URL}/admin-subscribe`} target="_blank" rel="noreferrer"
      title="Pay $30 to unlock admin actions"
      style={{ display: 'inline-block', opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'auto', textDecoration: 'none', ...style }}
      onClick={e => { e.preventDefault(); window.open(`${MOBILE_APP_URL}/admin-subscribe`, '_blank') }}>
      <span className="btn" style={{ background: '#9ca3af', pointerEvents: 'none' }}>🔒 {label}</span>
    </a>
  )
}

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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#fff7f0', border: '1px solid #fcd9b6', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600, flexShrink: 0 }}>🔗 Your site:</span>
      <code style={{ flex: 1, minWidth: 160, fontSize: '0.85rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</code>
      <button onClick={copy} style={{ fontSize: '0.8rem', fontWeight: 600, border: '1px solid #e5e7eb', background: copied ? '#16a34a' : '#fff', color: copied ? '#fff' : '#e8843c', borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

const EMPTY_LISTING = { item_type: 'pet', name: '', description: '', price: '', image_url: '' }

// Lets a new tenant (whose site starts empty — the mobile app has no
// concept of which tenant a listing belongs to yet) populate their own
// storefront directly, without waiting on a customer to propose something.
function AddListingForm({ onAdded }) {
  const [form, setForm] = useState(EMPTY_LISTING)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

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
      })
      setForm(EMPTY_LISTING)
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
          {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
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
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Price (optional)</label>
          <input value={form.price} onChange={set('price')} placeholder="e.g. Free, $25/walk"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>Photo URL (optional)</label>
          <input value={form.image_url} onChange={set('image_url')} placeholder="https://…"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
        </div>
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={saving || !form.name.trim() || !form.description.trim()} className="btn"
        style={{ background: '#e8843c', alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Adding…' : 'Add Listing'}
      </button>
    </form>
  )
}

function AdminDashboardInner({ onLogout, isTryout }) {
  const [tab, setTab] = useState('listings')
  const [pending, setPending] = useState([])
  const [published, setPublished] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [events, setEvents] = useState([])
  const [approveTarget, setApproveTarget] = useState(null)
  const [slug, setSlug] = useState(undefined)

  const load = () => {
    getPendingItems().then(setPending).catch(() => setPending([]))
    getMyItems().then(setPublished).catch(() => setPublished([]))
    getEnquiries().then(setEnquiries).catch(() => setEnquiries([]))
    getAuditEvents().then(setEvents).catch(() => setEvents([]))
    getMyConfig().then(c => setSlug(c.slug)).catch(() => {})
  }

  useEffect(load, [])

  const approveListing = async (id) => {
    await approveItem(id)
    load()
  }

  const approveEnquiry = async (id, bookingDate) => {
    await decideEnquiry(id, true)
    setApproveTarget(null)
    load()
  }

  const rejectEnquiry = async (id) => {
    await decideEnquiry(id, false)
    load()
  }

  const allItems = [...pending, ...published]
  const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]))
  const pendingEnquiries = enquiries.filter(e => e.status === 'pending')
  const approvedBookings = enquiries.filter(e => e.status === 'approved')

  const TABS = [
    { id: 'listings', label: `Listings${pending.length ? ` (${pending.length} pending)` : ''}` },
    { id: 'add', label: '+ Add Listing' },
    { id: 'enquiries', label: `Enquiries${pendingEnquiries.length ? ` (${pendingEnquiries.length})` : ''}` },
    { id: 'calendar', label: 'Calendar' },
    { id: 'activity', label: `Activity${events.length ? ` (${events.length})` : ''}` },
  ]

  return (
    <div>
      {isTryout && <TryoutBanner />}
      <ShareableLink slug={slug} />
      {approveTarget && (
        <ApproveModal
          enquiry={approveTarget}
          itemName={itemMap[approveTarget.item_id]?.name || 'Listing'}
          onConfirm={date => approveEnquiry(approveTarget.id, date)}
          onCancel={() => setApproveTarget(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Admin Dashboard</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
            Approve listings, manage bookings, and view your calendar.
          </p>
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.9rem', color: '#777', cursor: 'pointer', fontSize: '0.85rem' }}>
          Sign out
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        {[
          { label: 'Published', value: published.length, color: '#16a34a' },
          { label: 'Pending listings', value: pending.length, color: '#e8843c' },
          { label: 'Pending enquiries', value: pendingEnquiries.length, color: '#7b5ea7' },
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
            background: 'none', borderBottom: `2.5px solid ${tab === t.id ? '#e8843c' : 'transparent'}`,
            color: tab === t.id ? '#e8843c' : '#6b7280',
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
                      <span className={`tag ${item.item_type}`}>{TYPE_LABELS[item.item_type] || item.item_type}</span>
                      <h3>{item.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.description}</p>
                      {item.price && <p style={{ fontWeight: 600, color: '#e8843c' }}>{item.price}</p>}
                      {isTryout
                        ? <LockedButton label="Approve & Publish" style={{ marginTop: '0.5rem' }} />
                        : <button className="btn" style={{ background: '#e8843c', marginTop: '0.5rem' }} onClick={() => approveListing(item.id)}>Approve & Publish</button>
                      }
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
                      <span className={`tag ${item.item_type}`}>{TYPE_LABELS[item.item_type] || item.item_type}</span>
                      <h3>{item.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{item.description}</p>
                      {item.price && <p style={{ fontWeight: 600, color: '#e8843c' }}>{item.price}</p>}
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Live</span>
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
            <AddListingForm onAdded={() => { load(); setTab('listings') }} />
          )}
        </div>
      )}

      {/* ── Enquiries tab ── */}
      {tab === 'enquiries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pendingEnquiries.length === 0 && approvedBookings.length === 0 && (
            <p style={{ color: '#9ca3af' }}>No enquiries yet.</p>
          )}

          {pendingEnquiries.length > 0 && (
            <>
              <h3 style={sectionHead}>Needs a Response</h3>
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
                        <button className="btn" style={{ background: '#e8843c', fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => setApproveTarget(e)}>Approve</button>
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
              <h3 style={{ ...sectionHead, marginTop: pendingEnquiries.length ? '1.5rem' : 0 }}>Approved Bookings</h3>
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
          {approvedBookings.filter(b => b.booking_date).length === 0 && (
            <div className="banner" style={{ marginBottom: '1.25rem' }}>
              No bookings have a date yet. Approve an enquiry and set a date to see it here.
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
  )
}

const sectionHead = { fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#374151' }
const navBtnStyle = { background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, color: '#374151' }
const enquiryCard = { display: 'flex', alignItems: 'flex-start', gap: '1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem' }
