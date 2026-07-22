import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getItem, getConfig, trackEvent } from '../../api/client'
import { EnquiryModal } from './EnquiryModal'

const TYPE_LABEL = {
  pet:                 'Adopt',
  hike:                'Group Hike',
  service:             'Walk / Sit',
  petting_zoo_booking: 'Mini Petting Zoo',
  event:               'Event',
  stall:               'Stall / Shop',
  lost_found:          'Lost & Found',
}

export default function ItemDetail() {
  const { id, slug } = useParams()
  const homeHref = slug ? `/t/${slug}` : '/'
  const [item, setItem] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    getItem(id, slug).then(data => {
      setItem(data)
      setLoading(false)
      if (data) trackEvent('item_viewed', `Item ${data.id}: ${data.name}`, slug)
    }).catch(() => setLoading(false))
    getConfig(slug).then(setConfig).catch(() => setConfig(null))
  }, [id, slug])

  const handleEnquire = () => {
    trackEvent('enquiry_intent', `Item ${item.id}: ${item.name}`, slug)
    setModalOpen(true)
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: '#555' }}>Loading…</div>
  }

  if (!item) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#c00' }}>Listing not found.</p>
        <Link to={homeHref} className="btn btn--outline" style={{ marginTop: '1rem', display: 'inline-block' }}>← Back to listings</Link>
      </div>
    )
  }

  const m = item.listing_meta || {}
  const modeConfig = (config?.mode_config ?? []).find(mode => mode.key === item.item_type)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem' }}>
      {modalOpen && <EnquiryModal item={item} onClose={() => setModalOpen(false)} />}

      <Link to={homeHref} style={{ color: '#7a6a58', fontSize: '0.9rem', textDecoration: 'none' }}>← Back to listings</Link>

      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.name}
          onError={e => { e.target.style.display = 'none' }}
          style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, marginTop: '1rem' }}
        />
      )}

      <div style={{ marginTop: '1rem' }}>
        <span className={`tag ${item.item_type}`} style={{ fontSize: '0.8rem' }}>
          {modeConfig?.label || TYPE_LABEL[item.item_type] || item.item_type}
        </span>
        <h2 style={{ margin: '0.5rem 0', fontSize: '1.75rem' }}>{item.name}</h2>

        {m.location && <p style={{ color: '#888', margin: '0.25rem 0' }}>📍 {m.location}</p>}
        {item.price && <p style={{ fontWeight: 600, color: 'var(--accent)', margin: '0.25rem 0' }}>{item.price}</p>}

        <p style={{ lineHeight: 1.7, marginTop: '1rem', color: '#333' }}>{item.description}</p>

        {(m.breed || m.age) && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem' }}>
            {m.breed && <span><strong>Breed:</strong> {m.breed}</span>}
            {m.age   && <span><strong>Age:</strong> {m.age} yrs</span>}
          </div>
        )}

        {m.contact && (
          <p style={{ marginTop: '0.75rem' }}><strong>Contact:</strong> {m.contact}</p>
        )}

        <button
          className="btn"
          onClick={handleEnquire}
          style={{ marginTop: '1.5rem', backgroundColor: 'var(--accent)', color: '#fff', border: 'none' }}
        >
          {item.cta_label || modeConfig?.cta_label || 'Enquire about this listing'}
        </button>
      </div>
    </div>
  )
}
