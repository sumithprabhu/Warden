/**
 * Warden — Unlink SDK Test Script
 *
 * Tests all Unlink SDK functionality step by step:
 * 1. Create Unlink account from mnemonic
 * 2. Get address
 * 3. Check environment info
 * 4. Register user
 * 5. Check balances
 * 6. Deposit tokens into privacy pool
 * 7. Transfer privately between two accounts
 * 8. Withdraw from privacy pool
 */

import {
  createUnlink,
  createUnlinkClient,
  unlinkAccount,
  unlinkEvm,
  deriveAccountKeys,
  getEnvironment,
  getUser,
  createUser,
  deposit as rawDeposit,
} from "@unlink-xyz/sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { privateKeyToAccount, english, generateMnemonic, mnemonicToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ─── Config ───
const UNLINK_API_KEY = "9x7GMhbjmB1LncsNJLy5SY";
const ENGINE_URL = "https://staging-api.unlink.xyz";
const PRIVATE_KEY = "0xcf61b33f6fc6a965d302f8d50fc81dea5bc20c466a338ae29f8b27c56d3f45b6";
const MOCK_USDC = "0x81A36EB4CebEEA49C868932Cd60f6e6e90977164";
const RPC_URL = "https://sepolia.base.org";

// Two test mnemonics — one for "admin", one for "employee"
const ADMIN_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const EMPLOYEE_MNEMONIC = generateMnemonic(english);

const evmAccount = privateKeyToAccount(PRIVATE_KEY);

const walletClient = createWalletClient({
  account: evmAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function log(step, msg, data) {
  console.log(`\n[${"=".repeat(60)}]`);
  console.log(`[STEP ${step}] ${msg}`);
  if (data) console.log(JSON.stringify(data, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
  console.log(`[${"=".repeat(60)}]`);
}

function logError(step, msg, err) {
  console.error(`\n[❌ STEP ${step}] ${msg}`);
  console.error("Error:", err?.message || err);
  if (err?.code) console.error("Code:", err.code);
  if (err?.detail) console.error("Detail:", err.detail);
  if (err?.operation) console.error("Operation:", err.operation);
}

async function main() {
  console.log("\n🚀 Warden — Unlink SDK Full Test\n");
  console.log("EVM Account:", evmAccount.address);
  console.log("Engine URL:", ENGINE_URL);
  console.log("API Key:", UNLINK_API_KEY.slice(0, 5) + "...");
  console.log("Token:", MOCK_USDC);
  console.log("Employee Mnemonic:", EMPLOYEE_MNEMONIC.split(" ").slice(0, 3).join(" ") + "...");

  // ─── Step 1: Test raw API client ───
  let apiClient;
  try {
    apiClient = createUnlinkClient(ENGINE_URL, UNLINK_API_KEY);
    log(1, "API client created");
  } catch (err) {
    logError(1, "Failed to create API client", err);
    return;
  }

  // ─── Step 2: Get environment info ───
  try {
    const env = await getEnvironment(apiClient);
    log(2, "Environment info", env);
  } catch (err) {
    logError(2, "Failed to get environment", err);
  }

  // ─── Step 3: Derive admin account keys ───
  let adminKeys;
  try {
    const adminAccountProvider = unlinkAccount.fromMnemonic({ mnemonic: ADMIN_MNEMONIC });
    adminKeys = await adminAccountProvider.getAccountKeys();
    log(3, "Admin Unlink account derived", {
      address: adminKeys.address,
      masterPublicKey: adminKeys.masterPublicKey.toString().slice(0, 20) + "...",
    });
  } catch (err) {
    logError(3, "Failed to derive admin keys", err);
    return;
  }

  // ─── Step 4: Derive employee account keys ───
  let employeeKeys;
  try {
    const employeeAccountProvider = unlinkAccount.fromMnemonic({ mnemonic: EMPLOYEE_MNEMONIC });
    employeeKeys = await employeeAccountProvider.getAccountKeys();
    log(4, "Employee Unlink account derived", {
      address: employeeKeys.address,
      masterPublicKey: employeeKeys.masterPublicKey.toString().slice(0, 20) + "...",
    });
  } catch (err) {
    logError(4, "Failed to derive employee keys", err);
    return;
  }

  // ─── Step 5: Register admin user ───
  try {
    const result = await createUser(apiClient, {
      spendingPublicKey: adminKeys.spendingPublicKey,
      viewingPrivateKey: adminKeys.viewingPrivateKey,
      nullifyingKey: adminKeys.nullifyingKey,
    });
    log(5, "Admin user registered/fetched", result);
  } catch (err) {
    logError(5, "Failed to register admin (may already exist)", err);
    // Try to fetch existing
    try {
      const existing = await getUser(apiClient, adminKeys.address);
      log("5b", "Admin user already exists", existing);
    } catch (err2) {
      logError("5b", "Failed to fetch existing admin", err2);
    }
  }

  // ─── Step 6: Register employee user ───
  try {
    const result = await createUser(apiClient, {
      spendingPublicKey: employeeKeys.spendingPublicKey,
      viewingPrivateKey: employeeKeys.viewingPrivateKey,
      nullifyingKey: employeeKeys.nullifyingKey,
    });
    log(6, "Employee user registered", result);
  } catch (err) {
    logError(6, "Failed to register employee (may already exist)", err);
    try {
      const existing = await getUser(apiClient, employeeKeys.address);
      log("6b", "Employee user already exists", existing);
    } catch (err2) {
      logError("6b", "Failed to fetch existing employee", err2);
    }
  }

  // ─── Step 7: Create full Unlink client for admin ───
  let adminUnlink;
  try {
    adminUnlink = createUnlink({
      engineUrl: ENGINE_URL,
      apiKey: UNLINK_API_KEY,
      account: unlinkAccount.fromMnemonic({ mnemonic: ADMIN_MNEMONIC }),
      evm: unlinkEvm.fromViem({ walletClient, publicClient }),
    });
    const addr = await adminUnlink.getAddress();
    log(7, "Admin Unlink client created", { address: addr });
  } catch (err) {
    logError(7, "Failed to create admin Unlink client", err);
    return;
  }

  // ─── Step 8: Ensure admin is registered ───
  try {
    await adminUnlink.ensureRegistered();
    log(8, "Admin registered with Unlink");
  } catch (err) {
    logError(8, "Failed to ensure admin registered", err);
  }

  // ─── Step 9: Check balances ───
  try {
    const balances = await adminUnlink.getBalances();
    log(9, "Admin balances", balances);
  } catch (err) {
    logError(9, "Failed to get balances", err);
  }

  // ─── Step 10: Check approval state for deposit ───
  try {
    const approval = await adminUnlink.getApprovalState({
      token: MOCK_USDC,
      amount: parseUnits("100", 6).toString(),
    });
    log(10, "Approval state for 100 USDC deposit", approval);
  } catch (err) {
    logError(10, "Failed to check approval", err);
  }

  // ─── Step 11: Ensure ERC20 approval for Unlink pool ───
  try {
    const approvalResult = await adminUnlink.ensureErc20Approval({
      token: MOCK_USDC,
      amount: parseUnits("10000", 6).toString(),
    });
    log(11, "ERC20 approval result", approvalResult);
  } catch (err) {
    logError(11, "Failed to ensure approval", err);
  }

  // ─── Step 12: Mint some USDC to the EVM account first ───
  try {
    const mintAbi = [{
      inputs: [
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "mint",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    }];

    const mintHash = await walletClient.writeContract({
      address: MOCK_USDC,
      abi: mintAbi,
      functionName: "mint",
      args: [evmAccount.address, parseUnits("10000", 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    log(12, "Minted 10,000 USDC to EVM account", { txHash: mintHash });
  } catch (err) {
    logError(12, "Failed to mint USDC", err);
  }

  // ─── Step 13: Deposit into Unlink pool ───
  try {
    log(13, "Attempting deposit of 100 USDC into Unlink pool...");
    const depositResult = await adminUnlink.deposit({
      token: MOCK_USDC,
      amount: parseUnits("100", 6).toString(),
    });
    log(13, "Deposit result", depositResult);

    // Poll for completion
    const confirmed = await adminUnlink.pollTransactionStatus(depositResult.txId, {
      intervalMs: 3000,
      timeoutMs: 120000,
    });
    log("13b", "Deposit confirmed", confirmed);
  } catch (err) {
    logError(13, "Deposit failed", err);

    // Try with explicit parameters
    console.log("\n  → Trying manual deposit flow...");
    try {
      const env = await getEnvironment(apiClient);
      console.log("  Environment:", JSON.stringify(env, null, 2));
    } catch (e2) {
      console.error("  → Manual flow also failed:", e2.message);
    }
  }

  // ─── Step 14: Check balances after deposit ───
  try {
    const balances = await adminUnlink.getBalances();
    log(14, "Admin balances after deposit attempt", balances);
  } catch (err) {
    logError(14, "Failed to get balances after deposit", err);
  }

  // ─── Step 15: Transfer to employee (PRIVATE TRANSFER!) ───
  try {
    log(15, "Attempting PRIVATE transfer of 50 USDC to employee...");
    const transferResult = await adminUnlink.transfer({
      token: MOCK_USDC,
      amount: parseUnits("50", 6).toString(),
      recipientAddress: employeeKeys.address,
    });
    log(15, "🎉 PRIVATE TRANSFER result", transferResult);

    const confirmed = await adminUnlink.pollTransactionStatus(transferResult.txId, {
      intervalMs: 3000,
      timeoutMs: 120000,
    });
    log("15b", "Transfer confirmed", confirmed);
  } catch (err) {
    logError(15, "Private transfer failed", err);
  }

  // ─── Step 16: Check employee balance ───
  try {
    const employeeUnlink = createUnlink({
      engineUrl: ENGINE_URL,
      apiKey: UNLINK_API_KEY,
      account: unlinkAccount.fromMnemonic({ mnemonic: EMPLOYEE_MNEMONIC }),
    });
    await employeeUnlink.ensureRegistered();
    const balances = await employeeUnlink.getBalances();
    log(16, "Employee balances", balances);
  } catch (err) {
    logError(16, "Failed to check employee balance", err);
  }

  // ─── Step 17: Get transaction history ───
  try {
    const txs = await adminUnlink.getTransactions();
    log(17, "Admin transaction history", txs);
  } catch (err) {
    logError(17, "Failed to get transactions", err);
  }

  // ─── Step 18: Try multi-transfer (payroll style) ───
  try {
    log(18, "Attempting multi-recipient transfer (payroll)...");
    const result = await adminUnlink.transfer({
      token: MOCK_USDC,
      transfers: [
        { recipientAddress: employeeKeys.address, amount: parseUnits("25", 6).toString() },
      ],
    });
    log(18, "🎉 Multi-transfer result", result);
  } catch (err) {
    logError(18, "Multi-transfer failed", err);
  }

  // ─── Step 19: Employee withdraw to EVM address ───
  try {
    const employeeUnlink = createUnlink({
      engineUrl: ENGINE_URL,
      apiKey: UNLINK_API_KEY,
      account: unlinkAccount.fromMnemonic({ mnemonic: EMPLOYEE_MNEMONIC }),
    });

    log(19, "Employee attempting withdrawal to EVM address...");
    const withdrawResult = await employeeUnlink.withdraw({
      token: MOCK_USDC,
      amount: parseUnits("10", 6).toString(),
      recipientEvmAddress: evmAccount.address,
    });
    log(19, "🎉 Withdrawal result", withdrawResult);
  } catch (err) {
    logError(19, "Withdrawal failed", err);
  }

  console.log("\n\n✅ Test complete! Check results above.\n");
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
