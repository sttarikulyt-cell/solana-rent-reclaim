import { isValidSolanaAddress, calculateComputeUnits, calculateRequiredBalance, groupAccountsByProgram } from '@/lib/solana';
import { getScanCache, setScanCache, clearScanCache, getAdminConfig } from '@/lib/storage';
import { fetchAccountsServer, fetchBalanceServer, PROGRAMS } from '@/lib/scanner';

// Rent per token account (in lamports)
const RENT_PER_ACCOUNT = 2039280;

// Calculate scan results
function calculateScanResults(accounts, walletBalance, adminConfig) {
  // Separate empty and non-empty accounts
  const emptyAccounts = accounts.filter((a) => a.tokenAmount === 0);
  const nonEmptyAccounts = accounts.filter((a) => a.tokenAmount > 0);

  // Group empty accounts by program
  const groups = groupAccountsByProgram(emptyAccounts);

  // Calculate trapped SOL
  const totalTrapped = emptyAccounts.length * RENT_PER_ACCOUNT;

  // Calculate required balance for claiming
  // Worst case: Token-2022 accounts (2500 CU per close)
  // txCost = 5000 + ceil(priorityFee * unitsFor(20, true) / 1e6)
  // unitsFor(20, true) = 1000 + 20 * 2500 = 51000
  const maxBatchCU = calculateComputeUnits(20, true);
  const priorityFeePerBatch = Math.ceil((adminConfig.priorityFee * maxBatchCU) / 1e6);
  const txCost = 5000 + priorityFeePerBatch;
  const requiredBalance = calculateRequiredBalance(txCost);

  // Determine if user can claim
  const canClaim = walletBalance >= requiredBalance && emptyAccounts.length > 0;

  return {
    totalTrapped,
    emptyAccounts: emptyAccounts.length,
    nonEmptyAccounts: nonEmptyAccounts.length,
    walletBalance,
    accountsByProgram: {
      spl: groups.spl.length,
      token22: groups.token22.length,
    },
    canClaim,
    requiredBalance,
    txCostEstimate: txCost,
    accounts: emptyAccounts,
  };
}

// Main handler
export async function POST(request) {
  try {
    const body = await request.json();
    const { address, bypassCache = false } = body;

    // Validate address
    if (!isValidSolanaAddress(address)) {
      return Response.json(
        { error: 'Invalid Solana address' },
        { status: 400 }
      );
    }

    // Load admin config
    const adminConfig = getAdminConfig();

    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = getScanCache(address);
      if (cached) {
        return Response.json(cached);
      }
    } else {
      // Clear cache when bypassing
      clearScanCache(address);
    }

    // Fetch accounts from Solana
    const accounts = await fetchAccountsServer(address);

    // Fetch wallet balance
    const walletBalance = await fetchBalanceServer(address);

    // Calculate results
    const results = calculateScanResults(accounts, walletBalance, adminConfig);

    // Cache results (45s TTL)
    setScanCache(address, results);

    return Response.json(results);
  } catch (error) {
    console.error('Scan error:', error);
    return Response.json(
      { error: error.message || 'Scan failed' },
      { status: 500 }
    );
  }
}
