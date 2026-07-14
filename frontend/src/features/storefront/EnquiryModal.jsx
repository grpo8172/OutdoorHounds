import { useState } from 'react'
import { createEnquiry, trackEvent } from '../../api/client'

export function EnquiryModal({ item, onClose }) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await createEnquiry(item.id, message.trim())
      await trackEvent('enquiry_submitted', `Item ${item.id}: ${item.name}`)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: '1.75rem',
        maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ fontSize: 52, marginBottom: '0.75rem' }}>✅</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#111' }}>Enquiry sent!</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
              We'll review your message and get back to you shortly. Nothing is confirmed until the owner approves.
            </p>
            <button className="btn" style={{ width: '100%', marginTop: '1.25rem', background: 'var(--accent)' }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ margin: '0 0 0.25rem', color: '#111' }}>Get in touch</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
              About: <strong style={{ color: '#374151' }}>{item.name}</strong>
            </p>
            <textarea
              autoFocus
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us a bit about you and what you're looking for…"
              rows={4}
              style={{
                width: '100%', padding: '0.75rem', border: '1.5px solid #d1d5db',
                borderRadius: 8, fontSize: '0.95rem', resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
            />
            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="btn btn--outline"
                style={{ flex: 1 }}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 2, background: 'var(--accent)', opacity: message.trim() && !submitting ? 1 : 0.5, cursor: message.trim() && !submitting ? 'pointer' : 'default' }}
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
              >
                {submitting ? 'Sending…' : 'Send Enquiry'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
