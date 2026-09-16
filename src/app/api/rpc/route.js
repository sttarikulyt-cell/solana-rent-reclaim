import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { method, address } = await req.json()
    if (method !== 'getTokenAccountsByOwner' || !address) {
      return NextResponse.json({ error: 'Invalid Request' }, { status: 400 })
    }

    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          address,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' }
        ]
      })
    })

    const data = await response.json()
    const accounts = data.result?.value || []
    
    // শূন্য ব্যালেন্সের অ্যাকাউন্ট নির্বাচন করা
    const emptyAccounts = accounts.filter(acc => {
      const amount = acc.account.data.parsed.info.tokenAmount.uiAmount
      return amount === 0
    })

    const trappedSol = (emptyAccounts.length * 0.00203928).toFixed(4)

    return NextResponse.json({
      accountsCount: emptyAccounts.length,
      trappedSol
    })
  } catch (error) {
    return NextResponse.json({ error: 'RPC Server Error' }, { status: 500 })
  }
}
