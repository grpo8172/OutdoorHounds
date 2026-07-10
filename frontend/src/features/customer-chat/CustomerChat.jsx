import { useState, useEffect } from 'react'
import { getConfig } from '../../api/client'

export default function CustomerChat() {
  const [cfg, setCfg] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  useEffect(() => {
    getConfig().then(data => {
      setCfg(data)
      const greeting = data.chat_greeting ||
        `Hi! I'm the ${data.business_name || 'assistant'}. Ask me anything about our listings — I can't confirm bookings but I can point you in the right direction.`
      setMessages([{ role: 'bot', text: greeting }])
    }).catch(() => {
      setMessages([{ role: 'bot', text: "Hi! How can I help you today?" }])
    })
  }, [])

  const send = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    setMessages(m => [...m, userMsg])
    setInput('')
    const reply = "Thanks for asking! To make a booking or enquiry, head back to the home page and tap the listing you're interested in."
    setTimeout(() => setMessages(m => [...m, { role: 'bot', text: reply }]), 400)
  }

  const placeholder = cfg?.chat_placeholder || 'Type your question…'
  const disclaimer = cfg?.chat_disclaimer || `This assistant can't confirm bookings or approve requests — use the enquiry button on any listing to reach us directly.`
  const title = cfg ? `Ask ${cfg.business_name || 'Us'}` : 'Ask Us'

  return (
    <div className="chat-box">
      <h2>{title}</h2>
      {messages.map((m, i) => (
        <div key={i} className={`msg ${m.role}`}>{m.text}</div>
      ))}
      <div className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={placeholder}
        />
        <button className="btn" onClick={send}>Send</button>
      </div>
      <div className="banner">{disclaimer}</div>
    </div>
  )
}
