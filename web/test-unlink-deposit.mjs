/**
 * Test Script: Direct deposit into Unlink privacy pool
 *
 * This skips the intermediate "funding address" step and deposits
 * USDC directly from the EVM wallet into the Unlink privacy pool.
 *
 * Usage: node test-unlink-deposit.mjs [amount]
 *   amount defaults to 1 (i.e. 1 USDC)
 *
 * Reads env vars from .env.local in the same directory.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  createUnlink,
  unlinkAccount,
  unlinkEvm,
} from "@unlink-xyz/sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

// ── Load env from .env.local ───────────────────────────────────────
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
const USDC_TOKEN = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"; // USDC on Base Sepolia
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const API_KEY = process.env.UNLINK_API_KEY;
const EVM_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;

if (!API_KEY) throw new Error("Missing UNLINK_API_KEY");
if (!EVM_PRIVATE_KEY) throw new Error("Missing DEPLOYER_PRIVATE_KEY or EVM_PRIVATE_KEY");

const depositAmountHuman = process.argv[2] || "1"; // default 1 USDC
const depositAmountUnits = String(Math.round(parseFloat(depositAmountHuman) * 1e6)); // USDC has 6 decimals

console.log("=== Unlink Direct Deposit Test ===\n");
console.log(`USDC Token:    ${USDC_TOKEN}`);
console.log(`Amount:        ${depositAmountHuman} USDC (${depositAmountUnits} units)`);
console.log(`RPC:           ${RPC_URL}`);
console.log(`Engine:        ${ENGINE_URL}`);

// ── Setup Viem clients ─────────────────────────────────────────────
const evmAccount = privateKeyToAccount(EVM_PRIVATE_KEY);
console.log(`EVM Wallet:    ${evmAccount.address}\n`);

const walletClient = createWalletClient({
  account: evmAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// ── Check on-chain USDC balance before deposit ─────────────────────
const USDC_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const onChainBalance = await publicClient.readContract({
  address: USDC_TOKEN,
  abi: USDC_ABI,
  functionName: "balanceOf",
  args: [evmAccount.address],
});
console.log(`On-chain USDC: ${formatUnits(onChainBalance, 6)} USDC`);

if (onChainBalance < BigInt(depositAmountUnits)) {
  console.error(`\nInsufficient USDC balance. Need ${depositAmountHuman} USDC but wallet has ${formatUnits(onChainBalance, 6)} USDC`);
  console.error(`Fund ${evmAccount.address} with USDC on Base Sepolia first.`);
  process.exit(1);
}

// ── Create Unlink client (mnemonic for privacy pool identity) ──────
const mnemonic = generateMnemonic(wordlist);
console.log(`\nMnemonic:      ${mnemonic} (test-only, generated fresh)`);

const unlinkClient = createUnlink({
  engineUrl: ENGINE_URL,
  apiKey: API_KEY,
  account: unlinkAccount.fromMnemonic({ mnemonic }),
  evm: unlinkEvm.fromViem({ walletClient, publicClient }),
});

// ── Step 1: Register with Unlink ───────────────────────────────────
console.log("\n[1/4] Registering with Unlink...");
await unlinkClient.ensureRegistered();
const unlinkAddr = await unlinkClient.getAddress();
console.log(`  Registered. Unlink address: ${unlinkAddr}`);

// ── Step 2: Check pool balance before ──────────────────────────────
console.log("\n[2/4] Checking pool balance before deposit...");
const balanceBefore = await unlinkClient.getBalances({ token: USDC_TOKEN });
console.log(`  Pool balance before: ${JSON.stringify(balanceBefore)}`);

// ── Step 3: Approve ERC20 + Deposit directly ──────────────────────
console.log("\n[3/4] Approving USDC and depositing into privacy pool...");
console.log(`  Approving ${depositAmountHuman} USDC...`);
await unlinkClient.ensureErc20Approval({
  token: USDC_TOKEN,
  amount: depositAmountUnits,
});
console.log("  Approval done");

console.log(`  Depositing ${depositAmountHuman} USDC...`);
const depositResult = await unlinkClient.deposit({
  token: USDC_TOKEN,
  amount: depositAmountUnits,
});
console.log(`  Deposit submitted. txId: ${depositResult.txId}`);

// ── Step 4: Poll for confirmation ──────────────────────────────────
console.log("\n[4/4] Polling for confirmation (up to 5 min)...");
const confirmed = await unlinkClient.pollTransactionStatus(depositResult.txId, {
  intervalMs: 5000,
  timeoutMs: 300000,
});
console.log(`  Confirmed! Status: ${confirmed.status}`);

// ── Final balance check ────────────────────────────────────────────
const balanceAfter = await unlinkClient.getBalances({ token: USDC_TOKEN });
console.log(`\n=== Result ===`);
console.log(`Pool balance after:  ${JSON.stringify(balanceAfter)}`);
console.log(`Transaction ID:      ${depositResult.txId}`);
console.log(`\nDirect deposit successful! No intermediate funding address needed.`);
