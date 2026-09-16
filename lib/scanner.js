import { calculateComputeUnits, calculateRequiredBalance } from '@/lib/solana';

// Token program IDs
export const PROGRAMS = {
  SPL: 'TokenkegQfeZyiNwAJsyFbPVwwQQfuj5pH6PSeu9fs',
  TOKEN_22: 'TokenzQdBz7D5exjsFLQ4qfS54VzrDy68V6To7KKTc2',
};

// Fetch token accounts via RPC proxy (server-side only)
export async function fetchAccountsServer(address, baseUrl = '') {
  const rpcUrl = baseUrl || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_URL : '') || 'http://localhost:3000';

  const response = await fetch(`${rpcUrl}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        address,
        { programId: PROGRAMS.SPL },
        { encoding: 'jsonParsed' },
      ],
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Failed to fetch accounts');
  }

  return (data.result?.value || []).map((account) => ({
    address: account.pubkey,
    owner: account.account.owner,
    lamports: account.account.lamports,
    mint: account.account.data?.parsed?.info?.mint,
    tokenAmount: account.account.data?.parsed?.info?.tokenAmount?.uiAmount || 0,
  }));
}

// Fetch wallet balance via RPC proxy
export async function fetchBalanceServer(address, baseUrl = '') {
  const rpcUrl = baseUrl || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_URL : '') || 'http://localhost:3000';

  const response = await fetch(`${rpcUrl}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address],
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Failed to fetch balance');
  }

  return data.result?.value || 0;
}

// Calculate fee for a claim
export function calculateClaimFee(accountCount, feePercent) {
  const rentPerAccount = 2039280; // TOKEN_ACCOUNT_RENT
  const totalTrapped = accountCount * rentPerAccount;
  const fee = Math.floor((totalTrapped * feePercent) / 100);
  return Math.max(fee, 5000); // Minimum 5000 lamports
}

// Calculate batches needed
export function calculateBatchCount(accountCount, batchSize = 20) {
  return Math.ceil(accountCount / batchSize);
}

// Estimate transaction cost
export function estimateTxCost(accountCount, priorityFeePerUnit, batchSize = 20) {
  const batchCount = calculateBatchCount(accountCount, batchSize);
  const hasToken22 = false; // Assume SPL for conservative estimate
  
  let totalCost = 0;

  for (let i = 0; i < batchCount; i++) {
    const accountsInBatch = Math.min(batchSize, accountCount - i * batchSize);
    const computeUnits = calculateComputeUnits(accountsInBatch, hasToken22);
    const priorityFee = Math.ceil((priorityFeePerUnit * computeUnits) / 1e6);
    const baseFee = 5000; // Network fee
    totalCost += baseFee + priorityFee;
  }

  return totalCost;
}

// Validate if wallet can claim (has enough balance for fees)
export function canClaimWithBalance(walletBalance, accountCount, adminConfig) {
  const maxBatchCU = calculateComputeUnits(20, true); // Token-2022 worst case
  const priorityFeePerBatch = Math.ceil((adminConfig.priorityFee * maxBatchCU) / 1e6);
  const txCost = 5000 + priorityFeePerBatch;
  const requiredBalance = calculateRequiredBalance(txCost);

  return walletBalance >= requiredBalance;
}

// Estimate final user payout
export function estimateUserPayout(accountCount, walletBalance, feePercent) {
  const totalTrapped = accountCount * 2039280;
  const fee = calculateClaimFee(accountCount, feePercent);
  const userPayout = totalTrapped - fee;

  return {
    totalTrapped,
    fee,
    userPayout,
    feePercent,
  };
}
