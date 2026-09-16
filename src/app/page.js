'use client'
import { useState } from 'react'

export default function Home() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleScan = async () => {
    if (!address) return
    setLoading(true)
    try {
      const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getTokenAccountsByOwner', address })
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      alert('Error scanning wallet')
    }
    setLoading(false)
  }

  return (
    <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Solana Rent Reclaim</h1>
      <p>Reclaim trapped SOL from empty token accounts.</p>
      
      <div style={{ margin: '20px 0' }}>
        <input 
          type="text" 
          placeholder="Paste Solana Wallet Address" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#fff', boxSizing: 'border-box' }}
        />
        <button 
          onClick={handleScan}
          disabled={loading}
          style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 'bold' }}
        >
          {loading ? 'Scanning...' : 'Scan Address'}
        </button>
      </div>

      {result && (
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', textAlign: 'left' }}>
          <h3>Scan Results</h3>
          <p>Empty Accounts Found: {result.accountsCount || 0}</p>
          <p>Total Trapped SOL: {result.trappedSol || '0.0000'} SOL</p>
        </div>
      )}
    </main>
  )
}
