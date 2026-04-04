/**
 * Unlink Worker — Standalone Node.js script for Unlink SDK operations.
 * Called via child_process from Next.js API routes to avoid bundling issues.
 *
 * Usage: node workers/unlink-op.mjs <operation> <json-params>
 *
 * Operations: get-address, get-balances, register, deposit, transfer, withdraw, poll
 * Output: JSON on stdout
 */

import {
  createUnlink,
  createUnlinkClient,
  unlinkAccount,
  unlinkEvm,
  getEnvironment,
  BurnerWallet,
  getTransaction,
  getPermit2Nonce,
} from "@unlink-xyz/sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  erc20Abi,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const ENGINE_URL = "https://staging-api.unlink.xyz";
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";

function createClient(params) {
  const { apiKey, mnemonic, evmPrivateKey } = params;

  const opts = {
    engineUrl: ENGINE_URL,
    apiKey,
    account: unlinkAccount.fromMnemonic({ mnemonic }),
  };

  // Add EVM provider if private key provided (needed for deposit/approval)
  if (evmPrivateKey) {
    const account = privateKeyToAccount(evmPrivateKey);
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
    opts.evm = unlinkEvm.fromViem({ walletClient, publicClient });
  }

  return createUnlink(opts);
}

async function main() {
  const [,, operation, paramsJson] = process.argv;

  if (!operation || !paramsJson) {
    console.error("Usage: node unlink-op.mjs <operation> '<json-params>'");
    process.exit(1);
  }

  const params = JSON.parse(paramsJson);

  try {
    let result;

    switch (operation) {
      case "get-address": {
        const client = createClient(params);
        result = { address: await client.getAddress() };
        break;
      }

      case "register": {
        const client = createClient(params);
        await client.ensureRegistered();
        result = { registered: true, address: await client.getAddress() };
        break;
      }

      case "get-balances": {
        const client = createClient(params);
        await client.ensureRegistered();
        result = await client.getBalances(params.token ? { token: params.token } : undefined);
        break;
      }

      case "get-environment": {
        const apiClient = createUnlinkClient(ENGINE_URL, params.apiKey);
        result = await getEnvironment(apiClient);
        break;
      }

      case "deposit": {
        const client = createClient(params);
        await client.ensureRegistered();

        // Ensure approval first
        await client.ensureErc20Approval({
          token: params.token,
          amount: params.amount,
        });

        const depositResult = await client.deposit({
          token: params.token,
          amount: params.amount,
        });

        // Poll for completion
        const confirmed = await client.pollTransactionStatus(depositResult.txId, {
          intervalMs: 5000,
          timeoutMs: 300000, // 5 min
        });

        result = { ...confirmed, txId: depositResult.txId };
        break;
      }

      case "transfer": {
        const client = createClient(params);
        await client.ensureRegistered();

        let transferResult;

        if (params.transfers && params.transfers.length > 0) {
          // Multi-recipient transfer (payroll)
          transferResult = await client.transfer({
            token: params.token,
            transfers: params.transfers,
          });
        } else {
          // Single transfer
          transferResult = await client.transfer({
            token: params.token,
            amount: params.amount,
            recipientAddress: params.recipientAddress,
          });
        }

        result = { txId: transferResult.txId, status: transferResult.status };
        break;
      }

      case "transfer-and-poll": {
        const client = createClient(params);
        await client.ensureRegistered();

        let transferResult;

        if (params.transfers && params.transfers.length > 0) {
          transferResult = await client.transfer({
            token: params.token,
            transfers: params.transfers,
          });
        } else {
          transferResult = await client.transfer({
            token: params.token,
            amount: params.amount,
            recipientAddress: params.recipientAddress,
          });
        }

        const confirmed = await client.pollTransactionStatus(transferResult.txId, {
          intervalMs: 5000,
          timeoutMs: 300000,
        });

        result = { ...confirmed, txId: transferResult.txId };
        break;
      }

      case "withdraw": {
        const client = createClient(params);
        await client.ensureRegistered();

        const withdrawResult = await client.withdraw({
          token: params.token,
          amount: params.amount,
          recipientEvmAddress: params.recipientEvmAddress,
        });

        const confirmed = await client.pollTransactionStatus(withdrawResult.txId, {
          intervalMs: 5000,
          timeoutMs: 300000,
        });

        result = { ...confirmed, txId: withdrawResult.txId };
        break;
      }

      case "poll": {
        const client = createClient(params);
        result = await client.pollTransactionStatus(params.txId, {
          intervalMs: 5000,
          timeoutMs: 300000,
        });
        break;
      }

      case "get-transactions": {
        const client = createClient(params);
        result = await client.getTransactions();
        break;
      }

      case "earn-deposit": {
        // Withdraw from privacy pool → deployer wallet → approve USDC → vault deposit → lpUSD
        // params: mnemonic, apiKey, vaultAddress, token, amount
        const { mnemonic, apiKey: ak, vaultAddress, token, amount } = params;

        const evmKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY);
        const evmAccount = privateKeyToAccount(evmKey);
        const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
        const walletClient = createWalletClient({
          account: evmAccount, chain: baseSepolia, transport: http(RPC_URL),
        });

        // 1. Withdraw from privacy pool to deployer wallet
        console.error("[earn-deposit] Withdrawing from pool to deployer...");
        const hlClient = createUnlink({
          engineUrl: ENGINE_URL, apiKey: ak,
          account: unlinkAccount.fromMnemonic({ mnemonic }),
          evm: unlinkEvm.fromViem({ walletClient, publicClient }),
        });
        await hlClient.ensureRegistered();

        const withdrawResult = await hlClient.withdraw({
          token, amount, recipientEvmAddress: evmAccount.address,
        });
        await hlClient.pollTransactionStatus(withdrawResult.txId, {
          intervalMs: 5000, timeoutMs: 300000,
        });
        console.error("[earn-deposit] Pool withdrawal confirmed");

        // 2. Approve USDC to vault
        console.error("[earn-deposit] Approving USDC to vault...");
        const approveTx = await walletClient.writeContract({
          address: token, abi: erc20Abi, functionName: "approve",
          args: [vaultAddress, BigInt(amount)],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });

        // 3. Deposit into vault → get lpUSD
        console.error("[earn-deposit] Depositing into vault...");
        const VAULT_DEPOSIT_ABI = [{ inputs: [{ type: "uint256", name: "amount" }], name: "deposit", outputs: [], stateMutability: "nonpayable", type: "function" }];
        const vaultTx = await walletClient.writeContract({
          address: vaultAddress, abi: VAULT_DEPOSIT_ABI, functionName: "deposit",
          args: [BigInt(amount)],
        });
        await publicClient.waitForTransactionReceipt({ hash: vaultTx });

        // 4. Check lpUSD balance
        const LP_BAL_ABI = [{ inputs: [{ type: "address", name: "account" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }];
        const lpBalance = await publicClient.readContract({
          address: vaultAddress, abi: LP_BAL_ABI, functionName: "balanceOf", args: [evmAccount.address],
        });

        result = {
          vaultTxHash: vaultTx,
          lpBalance: lpBalance.toString(),
          withdrawTxId: withdrawResult.txId,
        };
        break;
      }

      case "earn-withdraw": {
        // Vault withdraw → get USDC → deposit back to privacy pool
        // params: mnemonic, apiKey, vaultAddress, token, amount
        const { mnemonic, apiKey: ak, vaultAddress, token, amount } = params;

        const evmKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY);
        const evmAccount = privateKeyToAccount(evmKey);
        const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
        const walletClient = createWalletClient({
          account: evmAccount, chain: baseSepolia, transport: http(RPC_URL),
        });

        // 1. Withdraw from vault (burn lpUSD → get USDC)
        console.error("[earn-withdraw] Withdrawing from vault...");
        const VAULT_WITHDRAW_ABI = [{ inputs: [{ type: "uint256", name: "amount" }], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" }];
        const withdrawTx = await walletClient.writeContract({
          address: vaultAddress, abi: VAULT_WITHDRAW_ABI, functionName: "withdraw",
          args: [BigInt(amount)],
        });
        await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

        // 2. Deposit USDC back to Unlink pool
        console.error("[earn-withdraw] Depositing USDC back to pool...");
        const hlClient = createUnlink({
          engineUrl: ENGINE_URL, apiKey: ak,
          account: unlinkAccount.fromMnemonic({ mnemonic }),
          evm: unlinkEvm.fromViem({ walletClient, publicClient }),
        });
        await hlClient.ensureRegistered();

        await hlClient.ensureErc20Approval({ token, amount });
        const depResult = await hlClient.deposit({ token, amount });
        const confirmed = await hlClient.pollTransactionStatus(depResult.txId, {
          intervalMs: 5000, timeoutMs: 300000,
        });

        result = {
          withdrawTxHash: withdrawTx,
          poolDepositTxId: depResult.txId,
          status: confirmed.status,
        };
        break;
      }

      case "earn-balance": {
        // Check lpUSD balance for a given address on the vault
        // params: vaultAddress, address
        const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
        const LP_ABI = [
          { inputs: [{ type: "address", name: "account" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
          { inputs: [], name: "totalDeposits", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
        ];

        const [balance, totalDeposits] = await Promise.all([
          params.address
            ? publicClient.readContract({ address: params.vaultAddress, abi: LP_ABI, functionName: "balanceOf", args: [params.address] })
            : Promise.resolve(0n),
          publicClient.readContract({ address: params.vaultAddress, abi: LP_ABI, functionName: "totalDeposits" }),
        ]);

        result = {
          lpBalance: balance.toString(),
          totalDeposits: totalDeposits.toString(),
        };
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    // Output JSON to stdout
    console.log(JSON.stringify(result));
  } catch (err) {
    console.log(JSON.stringify({
      error: true,
      message: err.message,
      code: err.code,
      detail: err.detail,
      operation: err.operation,
    }));
    process.exit(1);
  }
}

main();
