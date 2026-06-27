import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [pending, setPending] = useState([])
  const [audit, setAudit] = useState([])

  const load = () => {
    fetch('/api/items/pending').then(r => r.json()).then(setPending).catch(() => setPending([]))
    fetch('/api/audit').then(r => r.json()).then(setAudit).catch(() => setAudit([]))
  }

  useEffect(load, [])

  const approve = async (id) => {
    await fetch(`/api/items/${id}/approve`, { method: 'POST' })
    load()
  }

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <div className="banner">Human-in-the-loop: AI proposals stay in <strong>pending_review</strong> until you approve them here. Every approval is recorded in the audit trail.</div>

      <h3 style={{ marginTop: '1.5rem' }}>Pending Review</h3>
      {pending.length === 0 && <p>Nothing pending.</p>}
      <div className="grid">
        {pending.map(item => (
          <div className="card" key={item.id}>
            <div className="card-body">
              <span className={`tag ${item.item_type}`}>{item.item_type}</span>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <button className="btn" onClick={() => approve(item.id)}>Approve & Publish</button>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: '2rem' }}>Audit Trail</h3>
      <ul>
        {audit.map(e => (
          <li key={e.id}><strong>{e.event_type}</strong> — {e.details} <em>({new Date(e.created_at).toLocaleString()})</em></li>
        ))}
      </ul>
    </div>
  )
}
