import { useState } from 'react'
import { runSetupAssistant } from '../../api/client'

export default function OwnerSetup() {
  const [prompt, setPrompt] = useState('Help me set up my pet sitting business with hikes and adoptions.')
  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const res = await runSetupAssistant(prompt)
      setProposal(res.proposed_setup)
    } catch {
      setProposal({ error: 'Could not reach the setup assistant.' })
    }
    setLoading(false)
  }

  return (
    <div className="chat-box">
      <h2>Owner Setup Assistant</h2>
      <p>Describe your business. The assistant will propose a setup — nothing goes live until you approve it.</p>
      <textarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} />
      <button className="btn" onClick={run} disabled={loading}>{loading ? 'Thinking...' : 'Generate Proposal'}</button>

      {proposal && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Proposed Setup (Draft)</h3>
          <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
            {JSON.stringify(proposal, null, 2)}
          </pre>
          <div className="banner">Status: <strong>pending_review</strong>. Review and approve from the Admin dashboard before it appears to customers.</div>
        </div>
      )}
    </div>
  )
}
