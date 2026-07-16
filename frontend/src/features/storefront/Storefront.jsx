import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getItems, getConfig, trackEvent } from '../../api/client'
import { EnquiryModal } from './EnquiryModal'

const ALL_TYPE_LABELS = {
  pet:                 'Adopt / Foster',
  hike:                'Group Hike',
  service:             'Pet Services',
  petting_zoo_booking: 'Mini Petting Zoo',
  event:               'Pet Event',
  stall:               'Stall / Shop',
  lost_found:          'Lost & Found',
}

const ALL_TYPE_EMOJIS = {
  pet: '🐾', hike: '🥾', service: '🦮', petting_zoo_booking: '🐑',
  event: '🎉', stall: '🛍️', lost_found: '🔍',
}

const STANDARD_CTA = {
  pet: 'Apply to Adopt', hike: 'Request a Spot', service: 'Enquire',
  event: 'Get Tickets', stall: 'Enquire', lost_found: 'I Think I Found Them',
}

// Sample/seed listings have no submitting user (mobile app submissions
// always set user_id) — flag them so visitors don't mistake demo content
// for real listings.
function SampleBadge({ item }) {
  if (item.user_id != null) return null
  return <span className="tag sample">Sample</span>
}

function sendEnquiry(item, prefix, openModal, slug) {
  trackEvent('enquiry_intent', `Item ${item.id}: ${item.name} — ${prefix}`, slug)
  openModal({ ...item, name: `${item.name} — ${prefix}` })
}

function PettingZooCard({ item, saved, onSave, openModal, slug }) {
  const m = item.listing_meta || {}
  const actions = [
    { label: 'Check availability', prompt: 'Check availability', style: 'btn btn--primary' },
    { label: 'Request booking', prompt: 'Request booking', style: 'btn btn--primary' },
    { label: 'Ask a question', prompt: 'Question', style: 'btn btn--outline' },
  ]
  return (
    <div className="card card--zoo">
      {item.image_url && <img src={item.image_url} alt={item.name} onError={e => { e.target.style.display = 'none' }} />}
      <div className="card-body">
        <span className="tag petting_zoo_booking">{ALL_TYPE_LABELS.petting_zoo_booking}</span>
        <SampleBadge item={item} />
        <h3>{item.name}</h3>
        <p style={{ marginBottom: '1rem' }}>{item.description}</p>
        <dl className="zoo-details">
          {m.animals_included && <><dt>Animals</dt><dd>{m.animals_included}</dd></>}
          {m.booking_duration  && <><dt>Duration</dt><dd>{m.booking_duration}</dd></>}
          {item.price          && <><dt>Price</dt><dd>{item.price}</dd></>}
          {m.service_area      && <><dt>Area</dt><dd>{m.service_area}</dd></>}
          {m.max_guests        && <><dt>Max guests</dt><dd>{m.max_guests}</dd></>}
          {m.suitable_ages     && <><dt>Suitable for</dt><dd>{m.suitable_ages}</dd></>}
          {m.indoor_outdoor    && <><dt>Setting</dt><dd>{m.indoor_outdoor}</dd></>}
          {m.available_dates   && <><dt>Availability</dt><dd>{m.available_dates}</dd></>}
        </dl>
        {m.safety_notes    && <p className="zoo-note"><strong>Safety:</strong> {m.safety_notes}</p>}
        {m.insurance_notes && <p className="zoo-note"><strong>Insurance &amp; licences:</strong> {m.insurance_notes}</p>}
        {m.contact         && <p className="zoo-note"><strong>Contact:</strong> {m.contact}</p>}
        <div className="zoo-actions">
          {actions.map(({ label, prompt, style }) => (
            <button key={label} className={style} onClick={() => sendEnquiry(item, prompt, openModal, slug)}>{label}</button>
          ))}
          <button className={`btn btn--outline${saved ? ' btn--saved' : ''}`} onClick={onSave}>{saved ? 'Saved ✓' : 'Save for later'}</button>
        </div>
      </div>
    </div>
  )
}

function StandardCard({ item, onEnquire, typeLabel }) {
  return (
    <div className="card">
      <img src={item.image_url || '/media/placeholder.jpg'} alt={item.name} onError={e => { e.target.style.display = 'none' }} />
      <div className="card-body">
        <span className={`tag ${item.item_type}`}>{typeLabel || ALL_TYPE_LABELS[item.item_type] || item.item_type}</span>
        <SampleBadge item={item} />
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        {item.price && <p><strong>{item.price}</strong></p>}
        <button className="btn" onClick={() => onEnquire(item)}>
          {STANDARD_CTA[item.item_type] || 'Enquire'}
        </button>
      </div>
    </div>
  )
}

export default function Storefront() {
  const { slug } = useParams()
  const [items, setItems] = useState([])
  const [config, setConfig] = useState(null)
  const [filter, setFilter] = useState('all')
  const [saved, setSaved] = useState(new Set())
  const [enquiryItem, setEnquiryItem] = useState(null)

  useEffect(() => {
    getItems(slug).then(setItems).catch(() => setItems([]))
    getConfig(slug).then(setConfig).catch(() => setConfig(null))
    trackEvent('storefront_viewed', '', slug)
  }, [slug])

  const typeLabelMap = Object.fromEntries(
    (config?.mode_config ?? []).map(m => [m.key, m.label])
  )

  const activeModeConfig = config?.mode_config
    ? config.mode_config.filter(m => m.active)
    : Object.keys(ALL_TYPE_LABELS).map(key => ({ key, active: true, emoji: ALL_TYPE_EMOJIS[key] || '', label: ALL_TYPE_LABELS[key] }))
  const activeModeKeys = new Set(activeModeConfig.map(m => m.key))
  const activeItems = items.filter(i => activeModeKeys.has(i.item_type))
  const filtered = filter === 'all' ? activeItems : activeItems.filter(i => i.item_type === filter)

  const activeFilters = [
    { key: 'all', label: 'All', emoji: '✨' },
    ...activeModeConfig.map(({ key, emoji, label }) => ({ key, label, emoji })),
  ]

  const handleEnquire = (item) => {
    trackEvent('enquiry_intent', `Item ${item.id}: ${item.name}`, slug)
    setEnquiryItem(item)
  }

  const toggleSave = (id) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const heroPhoto = config?.hero_photos?.[0]
  const businessName = config?.business_name || 'Outdoor Hounds'
  const siteEmoji = config?.site_emoji || '🐾'
  const tagline = config?.tagline || 'Adopt a friend, join a hike, book a service.'

  // Update browser tab title when config loads
  if (config) document.title = `${siteEmoji} ${businessName}`

  return (
    <div>
      {enquiryItem && <EnquiryModal item={enquiryItem} onClose={() => setEnquiryItem(null)} />}

      {/* Sample callout — only on the platform's own default tenant (no
          slug), so a real tenant's storefront never shows this about
          itself. This is the top-of-page "you can build your own" nudge. */}
      {!slug && (
        <div className="banner" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
          🎉 <strong>This is a sample homepage.</strong> Anyone can create their own branded app and storefront like this one — <Link to="/setup" style={{ color: 'var(--accent)', fontWeight: 700 }}>set up your own business here</Link>.
        </div>
      )}

      {/* Hero */}
      <div
        className="hero"
        style={heroPhoto ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${heroPhoto})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
        } : {}}
      >
        <h1 style={heroPhoto ? { color: '#fff' } : {}}>{siteEmoji} {businessName}</h1>
        <p style={heroPhoto ? { color: 'rgba(255,255,255,0.9)' } : {}}>{tagline}</p>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {activeFilters.map(({ key, label, emoji }) => (
          <button
            key={key}
            className={`btn filter-btn${filter === key ? ' filter-btn--active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#555', marginTop: '1rem' }}>No listings in this category yet.</p>
      )}

      <div className="grid">
        {filtered.map(item =>
          item.item_type === 'petting_zoo_booking' ? (
            <PettingZooCard key={item.id} item={item} saved={saved.has(item.id)} onSave={() => toggleSave(item.id)} openModal={setEnquiryItem} slug={slug} />
          ) : (
            <StandardCard key={item.id} item={item} onEnquire={handleEnquire} typeLabel={typeLabelMap[item.item_type]} />
          )
        )}
      </div>
    </div>
  )
}
