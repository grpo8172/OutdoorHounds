import { useEffect, useState } from 'react'
import { getItems, createEnquiry } from '../../api/client'

const TYPE_LABEL = { pet: 'Adopt', hike: 'Group Hike', service: 'Walk / Sit' }

export default function Storefront() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getItems().then(setItems).catch(() => setItems([]))
  }, [])

  const filtered = filter === 'all' ? items : items.filter(i => i.item_type === filter)

  const handleEnquire = async (item) => {
    const message = prompt(`Send an enquiry about "${item.name}". Tell Jenna a bit about you:`)
    if (!message) return
    await createEnquiry(item.id, message)
    alert("Enquiry sent! Jenna will review and get back to you. Nothing is confirmed until she approves it.")
  }

  return (
    <div>
      <div className="hero">
        <h1>Outdoor Hounds</h1>
        <p>Adopt a friend, join a pack hike, or book a walk & sit with Jenna.</p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        {['all', 'pet', 'hike', 'service'].map(t => (
          <button key={t} className="btn" style={{ marginRight: 8, background: filter === t ? 'var(--forest)' : 'var(--accent)' }} onClick={() => setFilter(t)}>
            {t === 'all' ? 'All' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p>No listings yet. (Run the backend seed script to populate.)</p>}

      <div className="grid">
        {filtered.map(item => (
          <div className="card" key={item.id}>
            <img src={item.image_url || '/media/placeholder.jpg'} alt={item.name} onError={(e) => { e.target.style.display = 'none' }} />
            <div className="card-body">
              <span className={`tag ${item.item_type}`}>{TYPE_LABEL[item.item_type] || item.item_type}</span>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {item.price && <p><strong>{item.price}</strong></p>}
              <button className="btn" onClick={() => handleEnquire(item)}>
                {item.item_type === 'pet' ? 'Apply to Adopt' : item.item_type === 'hike' ? 'Request a Spot' : 'Enquire'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
