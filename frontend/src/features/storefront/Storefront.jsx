import { useEffect, useState } from 'react'
import { getItems, createEnquiry } from '../../api/client'

const FILTERS = [
  { key: 'all',                  label: 'All' },
  { key: 'pet',                  label: 'Adopt' },
  { key: 'hike',                 label: 'Group Hike' },
  { key: 'service',              label: 'Walk / Sit' },
  { key: 'petting_zoo_booking',  label: 'Mini Petting Zoo' },
]

const TYPE_LABEL = {
  pet:                 'Adopt',
  hike:                'Group Hike',
  service:             'Walk / Sit',
  petting_zoo_booking: 'Mini Petting Zoo Booking',
}

const STANDARD_CTA = {
  pet:     'Apply to Adopt',
  hike:    'Request a Spot',
  service: 'Enquire',
}

async function sendEnquiry(itemId, prefix, onDone) {
  const message = window.prompt(prefix)
  if (!message) return
  await createEnquiry(itemId, `[${prefix.split(' ')[0].replace('[', '').replace(']', '')}] ${message}`)
  onDone()
}

function PettingZooCard({ item, saved, onSave }) {
  const m = item.listing_meta || {}

  const [sent, setSent] = useState(null)
  const notify = (label) => {
    setSent(label)
    setTimeout(() => setSent(null), 3000)
  }

  const actions = [
    {
      label: 'Check availability',
      prompt: 'Which dates are you interested in? Any other details:',
      style: 'btn btn--primary',
    },
    {
      label: 'Request booking',
      prompt: 'Tell Jenna about your event — date, location, number of guests:',
      style: 'btn btn--primary',
    },
    {
      label: 'Ask a question',
      prompt: 'What would you like to know?',
      style: 'btn btn--outline',
    },
  ]

  return (
    <div className="card card--zoo">
      {item.image_url && (
        <img src={item.image_url} alt={item.name} onError={(e) => { e.target.style.display = 'none' }} />
      )}
      <div className="card-body">
        <span className="tag petting_zoo_booking">{TYPE_LABEL.petting_zoo_booking}</span>
        <h3>{item.name}</h3>
        <p style={{ marginBottom: '1rem' }}>{item.description}</p>

        <dl className="zoo-details">
          {m.animals_included  && <><dt>Animals</dt>      <dd>{m.animals_included}</dd></>}
          {m.booking_duration  && <><dt>Duration</dt>     <dd>{m.booking_duration}</dd></>}
          {item.price          && <><dt>Price</dt>        <dd>{item.price}</dd></>}
          {m.service_area      && <><dt>Area</dt>         <dd>{m.service_area}</dd></>}
          {m.max_guests        && <><dt>Max guests</dt>   <dd>{m.max_guests}</dd></>}
          {m.suitable_ages     && <><dt>Suitable for</dt> <dd>{m.suitable_ages}</dd></>}
          {m.indoor_outdoor    && <><dt>Setting</dt>      <dd>{m.indoor_outdoor}</dd></>}
          {m.available_dates   && <><dt>Availability</dt> <dd>{m.available_dates}</dd></>}
        </dl>

        {m.safety_notes && (
          <p className="zoo-note"><strong>Safety:</strong> {m.safety_notes}</p>
        )}
        {m.insurance_notes && (
          <p className="zoo-note"><strong>Insurance &amp; licences:</strong> {m.insurance_notes}</p>
        )}
        {m.contact && (
          <p className="zoo-note"><strong>Contact:</strong> {m.contact}</p>
        )}

        {sent && <p className="zoo-sent">✓ {sent} — Jenna will be in touch soon.</p>}

        <div className="zoo-actions">
          {actions.map(({ label, prompt, style }) => (
            <button
              key={label}
              className={style}
              onClick={() => sendEnquiry(item.id, prompt, () => notify(label))}
            >
              {label}
            </button>
          ))}
          <button
            className={`btn btn--outline${saved ? ' btn--saved' : ''}`}
            onClick={onSave}
          >
            {saved ? 'Saved ✓' : 'Save for later'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StandardCard({ item, onEnquire }) {
  return (
    <div className="card">
      <img src={item.image_url || '/media/placeholder.jpg'} alt={item.name} onError={(e) => { e.target.style.display = 'none' }} />
      <div className="card-body">
        <span className={`tag ${item.item_type}`}>{TYPE_LABEL[item.item_type] || item.item_type}</span>
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
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [saved, setSaved] = useState(new Set())

  useEffect(() => {
    getItems().then(setItems).catch(() => setItems([]))
  }, [])

  const filtered = filter === 'all' ? items : items.filter(i => i.item_type === filter)

  const handleEnquire = async (item) => {
    const message = window.prompt(`Send an enquiry about "${item.name}". Tell Jenna a bit about you:`)
    if (!message) return
    await createEnquiry(item.id, message)
    window.alert("Enquiry sent! Jenna will review and get back to you. Nothing is confirmed until she approves it.")
  }

  const toggleSave = (id) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div>
      <div className="hero">
        <h1>Outdoor Hounds</h1>
        <p>Adopt a friend, join a pack hike, book a walk &amp; sit, or bring a mini petting zoo to your next event.</p>
      </div>

      <div className="filter-bar">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            className={`btn filter-btn${filter === key ? ' filter-btn--active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#555', marginTop: '1rem' }}>No listings in this category yet.</p>
      )}

      <div className="grid">
        {filtered.map(item =>
          item.item_type === 'petting_zoo_booking' ? (
            <PettingZooCard
              key={item.id}
              item={item}
              saved={saved.has(item.id)}
              onSave={() => toggleSave(item.id)}
            />
          ) : (
            <StandardCard key={item.id} item={item} onEnquire={handleEnquire} />
          )
        )}
      </div>
    </div>
  )
}
