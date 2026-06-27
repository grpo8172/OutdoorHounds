import { useState } from 'react'

export default function CustomerChat() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm the Outdoor Hounds assistant. I can answer questions about our adoptable pets, group hikes, and walking/sitting services. I can't confirm bookings or approve adoptions — Jenna does that personally." }
  ])
  const [input, setInput] = useState('')

  const send = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    setMessages(m => [...m, userMsg])
    setInput('')
    // MVP: grounded mock reply. Real LLM call wires through /api/assistant/chat.
    const reply = "Thanks for asking! I can share what's in our approved listings. To book or apply, send an enquiry from the home page and Jenna will review it personally."
    setTimeout(() => setMessages(m => [...m, { role: 'bot', text: reply }]), 400)
  }

  return (
    <div className="chat-box">
      <h2>Ask Outdoor Hounds</h2>
      {messages.map((m, i) => (
        <div key={i} className={`msg ${m.role}`}>{m.text}</div>
      ))}
      <div className="chat-input">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about hikes, adoptions, or sitting..." />
        <button className="btn" onClick={send}>Send</button>
      </div>
      <div className="banner">
        This assistant only answers from Jenna's approved business information. It cannot confirm bookings, approve adoptions, or give veterinary advice.
      </div>
    </div>
  )
}
