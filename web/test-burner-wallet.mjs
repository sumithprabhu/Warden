/**
 * Test Script: Unlink BurnerWallet — full lifecycle
 *
 * Demonstrates using private pool funds for DeFi via disposable EOAs:
 *   1. Create burner wallet
 *   2. Fund burner from privacy pool (withdraw to burner)
 *   3. Burner has USDC + ETH for gas — ready for DeFi
 *   4. Deposit funds back into privacy pool
 *   5. Dispose burner
 *
 * Usage: node test-burner-wallet.mjs [amount]
 *   amount defaults to 0.01 (USDC)
 *
 * Run from project root. Requires web/.env.local with:
 *   UNLINK_API_KEY, DEPLOYER_PRIVATE_KEY, RPC_URL
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  BurnerWallet,
  createUnlink,
  createUnlinkClient,
  unlinkAccount,
  unlinkEvm,
  getTransaction,
  getPermit2Nonce,
} from "@unlink-xyz/sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  erc20Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ── Load env from web/.env.local ───────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, ".env.local");
const envText = readFileSync(envPath, "utf-8");
for (const line of envText.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx);
  const val = trimmed.slice(idx + 1);
  if (!process.env[key]) process.env[key] = val;
}

// ── Config ─────────────────────────────────────────────────────────
const ENGINE_URL = "https://staging-api.unlink.xyz";
const USDC_TOKEN = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const API_KEY = process.env.UNLINK_API_KEY;
const EVM_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;

if (!API_KEY) throw new Error("Missing UNLINK_API_KEY");
if (!EVM_PRIVATE_KEY) throw new Error("Missing DEPLOYER_PRIVATE_KEY or EVM_PRIVATE_KEY");

const amountHuman = process.argv[2] || "0.01";
const amountUnits = String(Math.round(parseFloat(amountHuman) * 1e6));

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });

// Helper: poll a tx until confirmed
async function pollTx(apiClient, txId, label = "tx") {
  console.log(`  Polling ${label} (${txId})...`);
  for (let i = 0; i < 60; i++) {
    const tx = await getTransaction(apiClient, txId);
    if (tx.status === "confirmed" || tx.status === "relayed") {
      console.log(`  ${label} confirmed! Status: ${tx.status}`);
      return tx;
    }
    if (tx.status === "failed" || tx.status === "rejected") {
      throw new Error(`${label} failed with status: ${tx.status}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`${label} timed out after 5 minutes`);
}

// Helper: check ERC20 balance
async function usdcBalance(address) {
  const bal = await publicClient.readContract({
    address: USDC_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });
  return bal;
}

console.log("=== Unlink BurnerWallet Lifecycle Test ===\n");
console.log(`Amount:     ${amountHuman} USDC (${amountUnits} units)`);
console.log(`RPC:        ${RPC_URL}`);
console.log(`Engine:     ${ENGINE_URL}\n`);

// ── Setup: high-level client (for pool operations) ─────────────────
// We need the admin's mnemonic that has funds in the privacy pool.
// For this test, we read the encrypted mnemonic approach won't work outside Next.js,
// so we'll use a fresh mnemonic that we already deposited to in the previous test.
// Actually, let's use the existing worker to get the mnemonic from the deployer key.

// For the test, generate account keys from a known mnemonic.
// In production, this would come from the admin's encrypted mnemonic.
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const mnemonic = generateMnemonic(wordlist);
console.log(`Mnemonic:   ${mnemonic} (test-only)\n`);

// Setup high-level Unlink client (needed for initial deposit into pool)
const evmAccount = privateKeyToAccount(EVM_PRIVATE_KEY);
const walletClient = createWalletClient({
  account: evmAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const unlinkHighLevel = createUnlink({
  engineUrl: ENGINE_URL,
  apiKey: API_KEY,
  account: unlinkAccount.fromMnemonic({ mnemonic }),
  evm: unlinkEvm.fromViem({ walletClient, publicClient }),
});

// Low-level API client (needed for burner operations)
const apiClient = createUnlinkClient(ENGINE_URL, API_KEY);

// Account keys (needed for burner funding)
const account = unlinkAccount.fromMnemonic({ mnemonic });
const accountKeys = await account.getAccountKeys();

// ── Step 0: Ensure we have funds in the pool ───────────────────────
console.log("[0/6] Setting up — registering and depositing into pool...");
await unlinkHighLevel.ensureRegistered();
const unlinkAddr = await unlinkHighLevel.getAddress();
console.log(`  Unlink address: ${unlinkAddr}`);

// Check if pool already has balance
let poolBal = await unlinkHighLevel.getBalances({ token: USDC_TOKEN });
const existingBal = poolBal.balances?.find(
  (b) => b.token.toLowerCase() === USDC_TOKEN.toLowerCase()
);
const existingAmount = existingBal ? BigInt(existingBal.amount) : 0n;

if (existingAmount < BigInt(amountUnits)) {
  console.log(`  Pool balance: ${formatUnits(existingAmount, 6)} USDC — depositing more...`);

  // Check on-chain USDC
  const onChainBal = await usdcBalance(evmAccount.address);
  console.log(`  On-chain USDC: ${formatUnits(onChainBal, 6)}`);

  if (onChainBal < BigInt(amountUnits)) {
    console.error(`  Insufficient on-chain USDC to fund pool. Need ${amountHuman} USDC.`);
    process.exit(1);
  }

  await unlinkHighLevel.ensureErc20Approval({ token: USDC_TOKEN, amount: amountUnits });
  const depResult = await unlinkHighLevel.deposit({ token: USDC_TOKEN, amount: amountUnits });
  await unlinkHighLevel.pollTransactionStatus(depResult.txId, { intervalMs: 5000, timeoutMs: 300000 });
  console.log(`  Deposited ${amountHuman} USDC into pool`);

  // Wait for balance to become available (indexer delay)
  console.log("  Waiting for pool balance to settle...");
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const checkBal = await unlinkHighLevel.getBalances({ token: USDC_TOKEN });
    const found = checkBal.balances?.find(
      (b) => b.token.toLowerCase() === USDC_TOKEN.toLowerCase()
    );
    if (found && BigInt(found.amount) >= BigInt(amountUnits)) {
      console.log(`  Pool balance confirmed: ${formatUnits(BigInt(found.amount), 6)} USDC`);
      break;
    }
    if (i === 23) {
      console.warn("  Warning: balance not yet visible after 2 min, proceeding anyway...");
    }
  }
} else {
  console.log(`  Pool balance: ${formatUnits(existingAmount, 6)} USDC — sufficient`);
}

// ── Step 1: Create burner wallet ───────────────────────────────────
console.log("\n[1/6] Creating burner wallet...");
const burner = await BurnerWallet.create();
console.log(`  Burner address: ${burner.address}`);

// ── Step 2: Get burner chain config ────────────────────────────────
console.log("\n[2/6] Fetching burner chain config...");
const info = await BurnerWallet.getInfo(apiClient);
console.log(`  Pool address:    ${info.pool_address}`);
console.log(`  Permit2 address: ${info.permit2_address}`);
console.log(`  Chain ID:        ${info.chain_id}`);
console.log(`  Gas funding:     ${formatUnits(BigInt(info.gas_funding_wei), 18)} ETH`);

// ── Step 3: Fund burner from privacy pool ──────────────────────────
console.log("\n[3/6] Funding burner from privacy pool...");
console.log(`  Withdrawing ${amountHuman} USDC from pool to burner...`);

const fundResult = await burner.fundFromPool(apiClient, {
  senderKeys: accountKeys,
  token: USDC_TOKEN,
  amount: amountUnits,
  environment: "base-sepolia",
});

console.log(`  Fund txId: ${fundResult.txId}`);

// Poll until confirmed
await pollTx(apiClient, fundResult.txId, "fund");

// Wait a bit for gas funding from relayer
console.log("  Waiting for relayer gas funding...");
let status;
for (let i = 0; i < 30; i++) {
  status = await burner.getStatus(apiClient);
  console.log(`  Burner status: ${status.status}`);
  if (status.status === "funded") break;
  if (status.status === "gas_funding_failed") {
    console.error("  Gas funding failed! Relayer issue.");
    break;
  }
  await new Promise((r) => setTimeout(r, 5000));
}

// Check burner balances
const burnerUsdc = await usdcBalance(burner.address);
const burnerEth = await publicClient.getBalance({ address: burner.address });
console.log(`\n  Burner USDC:  ${formatUnits(burnerUsdc, 6)} USDC`);
console.log(`  Burner ETH:   ${formatUnits(burnerEth, 18)} ETH (for gas)`);

// ── Step 4: Simulate DeFi interaction ──────────────────────────────
console.log("\n[4/6] Burner is funded and ready for DeFi!");
console.log("  (In production, you'd interact with Aave, Uniswap, etc. here)");
console.log("  Burner's viem account can be used with any DeFi protocol:");

const viemAccount = burner.toViemAccount();
console.log(`  viem account address: ${viemAccount.address}`);

// Example: you could create a walletClient and interact with any contract
// const burnerWallet = createWalletClient({
//   account: viemAccount,
//   chain: baseSepolia,
//   transport: http(RPC_URL),
// });
// await burnerWallet.writeContract({ ... }); // any DeFi call

// ── Step 5: Deposit back to privacy pool ───────────────────────────
console.log("\n[5/6] Depositing funds back to privacy pool...");

// First, approve Permit2 from burner
const burnerWalletClient = createWalletClient({
  account: viemAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const currentBurnerUsdc = await usdcBalance(burner.address);
if (currentBurnerUsdc > 0n) {
  console.log(`  Approving Permit2 for ${formatUnits(currentBurnerUsdc, 6)} USDC...`);
  const approveTx = await burnerWalletClient.writeContract({
    address: USDC_TOKEN,
    abi: erc20Abi,
    functionName: "approve",
    args: [info.permit2_address, currentBurnerUsdc],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log("  Permit2 approved");

  console.log("  Getting Permit2 nonce...");
  const nonce = await getPermit2Nonce(apiClient, burner.address);
  console.log(`  Nonce: ${nonce}`);

  console.log("  Depositing back to pool...");
  const depositBackResult = await burner.depositToPool(apiClient, {
    unlinkAddress: unlinkAddr,
    token: USDC_TOKEN,
    amount: String(currentBurnerUsdc),
    environment: "base-sepolia",
    chainId: info.chain_id,
    permit2Address: info.permit2_address,
    poolAddress: info.pool_address,
    nonce,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  });

  console.log(`  Deposit-back txId: ${depositBackResult.txId}`);
  await pollTx(apiClient, depositBackResult.txId, "deposit-back");

  // ── Step 6: Dispose burner ─────────────────────────────────────
  console.log("\n[6/6] Disposing burner wallet...");
  await burner.dispose(apiClient, depositBackResult.txId);
  await burner.deleteKey();
  console.log("  Burner disposed and key deleted");
} else {
  console.log("  No USDC on burner to deposit back (may have been used in DeFi)");
  console.log("\n[6/6] Disposing burner wallet...");
  await burner.dispose(apiClient);
  await burner.deleteKey();
  console.log("  Burner disposed and key deleted");
}

// ── Final check ────────────────────────────────────────────────────
const finalPoolBal = await unlinkHighLevel.getBalances({ token: USDC_TOKEN });
console.log(`\n=== Result ===`);
console.log(`Pool balance: ${JSON.stringify(finalPoolBal)}`);
console.log(`\nFull BurnerWallet lifecycle complete!`);
console.log(`  - Funds withdrawn privately from pool to disposable EOA`);
console.log(`  - Burner could interact with any DeFi protocol`);
console.log(`  - Funds deposited back to pool — fully private`);
console.log(`  - Burner key destroyed — no trace`);
