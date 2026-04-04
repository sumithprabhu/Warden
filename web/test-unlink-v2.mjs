/**
 * Unlink Test v2 — Use the CORRECT token (real USDC on Base Sepolia)
 * The pool already has 1 USDC from the faucet. Let's transfer privately!
 */

import {
  createUnlink,
  createUnlinkClient,
  unlinkAccount,
  unlinkEvm,
  getEnvironment,
} from "@unlink-xyz/sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount, english, generateMnemonic } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const UNLINK_API_KEY = "9x7GMhbjmB1LncsNJLy5SY";
const ENGINE_URL = "https://staging-api.unlink.xyz";
const PRIVATE_KEY = "0xcf61b33f6fc6a965d302f8d50fc81dea5bc20c466a338ae29f8b27c56d3f45b6";
const REAL_USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"; // Real USDC on Base Sepolia
const RPC_URL = "https://sepolia.base.org";

const ADMIN_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const EMPLOYEE_MNEMONIC = generateMnemonic(english);

const evmAccount = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({ account: evmAccount, chain: baseSepolia, transport: http(RPC_URL) });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });

function log(step, msg, data) {
  console.log(`\n[STEP ${step}] ${msg}`);
  if (data) console.log(JSON.stringify(data, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
}

async function main() {
  console.log("\n🔒 Unlink Private Transfer Test v2\n");
  console.log("Using REAL USDC:", REAL_USDC);
  console.log("Employee mnemonic:", EMPLOYEE_MNEMONIC.split(" ").slice(0, 3).join(" ") + "...\n");

  // Get env info
  const apiClient = createUnlinkClient(ENGINE_URL, UNLINK_API_KEY);
  const env = await getEnvironment(apiClient);
  log(1, "Environment", env);

  // Create admin client (already has 1 USDC from faucet)
  const adminUnlink = createUnlink({
    engineUrl: ENGINE_URL,
    apiKey: UNLINK_API_KEY,
    account: unlinkAccount.fromMnemonic({ mnemonic: ADMIN_MNEMONIC }),
    evm: unlinkEvm.fromViem({ walletClient, publicClient }),
  });

  await adminUnlink.ensureRegistered();
  const adminAddr = await adminUnlink.getAddress();
  log(2, "Admin address", { address: adminAddr });

  // Check admin balance
  const adminBal = await adminUnlink.getBalances();
  log(3, "Admin balance (should have 1 USDC)", adminBal);

  if (!adminBal.balances?.length || adminBal.balances[0].amount === "0") {
    console.log("\n⚠️  No balance! Need to deposit first. Trying deposit...");

    // Check if we have USDC on-chain
    const erc20Abi = [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }];
    const onChainBal = await publicClient.readContract({ address: REAL_USDC, abi: erc20Abi, functionName: "balanceOf", args: [evmAccount.address] });
    console.log("On-chain USDC balance:", onChainBal.toString());

    if (onChainBal > 0n) {
      try {
        // Ensure approval for Permit2
        const approval = await adminUnlink.ensureErc20Approval({
          token: REAL_USDC,
          amount: onChainBal.toString(),
        });
        log("3b", "Approval", approval);

        // Deposit
        const depositResult = await adminUnlink.deposit({
          token: REAL_USDC,
          amount: Math.min(Number(onChainBal), 500000).toString(), // deposit up to 0.5 USDC
        });
        log("3c", "Deposit submitted", depositResult);

        const confirmed = await adminUnlink.pollTransactionStatus(depositResult.txId, { intervalMs: 3000, timeoutMs: 120000 });
        log("3d", "Deposit status", confirmed);

        const newBal = await adminUnlink.getBalances();
        log("3e", "Balance after deposit", newBal);
      } catch (err) {
        console.error("Deposit failed:", err.message, err.code, err.detail);
      }
    }
  }

  // Create employee client
  const employeeUnlink = createUnlink({
    engineUrl: ENGINE_URL,
    apiKey: UNLINK_API_KEY,
    account: unlinkAccount.fromMnemonic({ mnemonic: EMPLOYEE_MNEMONIC }),
  });
  await employeeUnlink.ensureRegistered();
  const empAddr = await employeeUnlink.getAddress();
  log(4, "Employee address", { address: empAddr });

  // ─── THE KEY TEST: Private Transfer ───
  const currentBal = await adminUnlink.getBalances();
  const usdcBalance = currentBal.balances?.find(b => b.token.toLowerCase() === REAL_USDC.toLowerCase());

  if (!usdcBalance || usdcBalance.amount === "0") {
    console.log("\n❌ No USDC balance in privacy pool. Cannot test transfer.");
    console.log("   The admin needs USDC deposited into Unlink first.");

    // Let's check all balances for any token
    console.log("   All balances:", JSON.stringify(currentBal, null, 2));

    // Try transfer with whatever balance exists
    if (currentBal.balances?.length > 0) {
      const availToken = currentBal.balances[0];
      console.log(`\n   Found balance: ${availToken.amount} of ${availToken.token}`);
      console.log("   Attempting transfer with this token...\n");

      try {
        // Transfer half
        const transferAmount = (BigInt(availToken.amount) / 2n).toString();
        console.log(`   Transferring ${transferAmount} of ${availToken.token} to employee...`);

        const result = await adminUnlink.transfer({
          token: availToken.token,
          amount: transferAmount,
          recipientAddress: empAddr,
        });
        log(5, "🎉🎉🎉 PRIVATE TRANSFER SUCCESS!", result);

        const confirmed = await adminUnlink.pollTransactionStatus(result.txId, { intervalMs: 3000, timeoutMs: 120000 });
        log("5b", "Transfer confirmed", confirmed);

        // Check both balances
        const adminBalAfter = await adminUnlink.getBalances();
        const empBalAfter = await employeeUnlink.getBalances();
        log(6, "Admin balance after transfer", adminBalAfter);
        log(7, "Employee balance after transfer", empBalAfter);

        // Employee withdraws to EVM
        if (empBalAfter.balances?.length > 0) {
          try {
            const empBal = empBalAfter.balances[0];
            const withdrawAmount = (BigInt(empBal.amount) / 2n).toString();
            console.log(`\n   Employee withdrawing ${withdrawAmount} to ${evmAccount.address}...`);

            const employeeWithEvm = createUnlink({
              engineUrl: ENGINE_URL,
              apiKey: UNLINK_API_KEY,
              account: unlinkAccount.fromMnemonic({ mnemonic: EMPLOYEE_MNEMONIC }),
              evm: unlinkEvm.fromViem({ walletClient, publicClient }),
            });

            const wResult = await employeeWithEvm.withdraw({
              token: empBal.token,
              amount: withdrawAmount,
              recipientEvmAddress: evmAccount.address,
            });
            log(8, "Employee withdrawal result", wResult);
          } catch (wErr) {
            console.error("   Withdrawal failed:", wErr.message);
          }
        }

        console.log("\n\n✅ PRIVATE TRANSFER WORKS! The Unlink SDK can do ZK transfers.\n");
        return;
      } catch (transferErr) {
        console.error("\n   Transfer failed:", transferErr.message, transferErr.code, transferErr.detail);
      }
    }
    return;
  }

  // Transfer with the real USDC balance
  try {
    const transferAmount = (BigInt(usdcBalance.amount) / 2n).toString();
    log(5, `Transferring ${transferAmount} USDC privately to employee...`);

    const result = await adminUnlink.transfer({
      token: REAL_USDC,
      amount: transferAmount,
      recipientAddress: empAddr,
    });
    log(5, "🎉 PRIVATE TRANSFER SUCCESS!", result);

    const confirmed = await adminUnlink.pollTransactionStatus(result.txId, { intervalMs: 3000, timeoutMs: 120000 });
    log("5b", "Confirmed", confirmed);

    const empBal = await employeeUnlink.getBalances();
    log(6, "Employee balance after private transfer", empBal);

    console.log("\n✅ PRIVATE TRANSFER WORKS!\n");
  } catch (err) {
    console.error("\n❌ Transfer failed:", err.message, err.code, err.detail);
  }
}

main().catch(console.error);
