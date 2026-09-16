'use client';

import { useState } from 'react';
import { isValidSolanaAddress, formatSol } from '@/lib/solana';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Home() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [useCache, setUseCache] = useState(true);

  const handleScan = async (e) => {
    e.preventDefault();

    if (!address.trim()) {
      setError('Enter a Solana address');
      return;
    }

    if (!isValidSolanaAddress(address.trim())) {
      setError('Invalid Solana address format');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), bypassCache: !useCache }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scan failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Scan failed. Try again.');
      console.error('Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="flex-1 flex flex-column flex-center p-4">
        <div className="container-sm">
          <div className="card mb-4">
            <h1 className="mb-2">Recover Trapped SOL</h1>
            <p className="mb-3">
              Every token you held created an account that holds a rent deposit of 0.00203928 SOL. Selling the token does not return it.
              This tool finds those deposits and lets you close the accounts to reclaim the SOL.
            </p>

            <form onSubmit={handleScan} className="gap-3 flex flex-column">
              <div>
                <label htmlFor="address" className="text-secondary mb-1 block">
                  Solana Address
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1A1z7zz..."
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2 align-center">
                <label htmlFor="cache-toggle" className="flex gap-2 align-center cursor-pointer">
                  <input
                    id="cache-toggle"
                    type="checkbox"
                    checked={useCache}
                    onChange={(e) => setUseCache(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="text-sm">Use cached results (45 sec)</span>
                </label>
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? 'Scanning...' : 'Scan Address'}
              </button>
            </form>

            {error && (
              <div className="mt-3 p-3 bg-tertiary border-error status-error rounded" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
                <p className="mb-0">{error}</p>
              </div>
            )}
          </div>

          {result && (
            <div className="card fade-in">
              <h2 className="mb-4">Results</h2>

              {result.emptyAccounts === 0 ? (
                <div className="p-3 bg-tertiary rounded mb-4">
                  <p className="text-secondary mb-0">No empty token accounts found. Your wallet is clean.</p>
                </div>
              ) : (
                <>
                  <div className="grid-2 gap-3 mb-4">
                    <div>
                      <p className="text-tertiary text-sm mb-2">Total Trapped</p>
                      <h3 className="status-success" style={{ margin: 0 }}>
                        {formatSol(result.totalTrapped)} SOL
                      </h3>
                    </div>

                    <div>
                      <p className="text-tertiary text-sm mb-2">Empty Accounts</p>
                      <h3 style={{ margin: 0 }}>{result.emptyAccounts}</h3>
                    </div>

                    {result.nonEmptyAccounts > 0 && (
                      <div>
                        <p className="text-tertiary text-sm mb-2">Still Holding Tokens</p>
                        <h3 style={{ margin: 0 }}>{result.nonEmptyAccounts}</h3>
                      </div>
                    )}

                    <div>
                      <p className="text-tertiary text-sm mb-2">Wallet Balance</p>
                      <h3 style={{ margin: 0 }}>{formatSol(result.walletBalance)} SOL</h3>
                    </div>
                  </div>

                  {result.accountsByProgram && (
                    <div className="mb-4">
                      <p className="text-tertiary text-sm mb-2">By Token Program</p>
                      <div className="card-compact bg-tertiary mb-2">
                        <div className="flex flex-between">
                          <span>SPL Token Program</span>
                          <span className="text-accent">{result.accountsByProgram.spl}</span>
                        </div>
                      </div>
                      <div className="card-compact bg-tertiary">
                        <div className="flex flex-between">
                          <span>Token-2022</span>
                          <span className="text-accent">{result.accountsByProgram.token22}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.canClaim ? (
                    <button className="btn-primary" onClick={() => alert('Phase 3: Wallet connection coming soon')}>
                      Connect Wallet to Claim
                    </button>
                  ) : (
                    <div className="p-3 bg-tertiary status-warning rounded" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--warning)' }}>
                      <p className="mb-1" style={{ fontWeight: 600 }}>
                        Wallet balance too low
                      </p>
                      <p className="text-sm text-secondary mb-0">
                        You need at least {formatSol(result.requiredBalance)} SOL to pay for the transaction. Get some SOL first.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-secondary border-border rounded" style={{ borderWidth: '1px', borderStyle: 'solid' }}>
                    <p className="text-sm text-tertiary mb-0">
                      Transaction fee estimate: {formatSol(result.txCostEstimate)} SOL
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
