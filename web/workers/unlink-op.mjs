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
        // BurnerWallet flow: create burner → fund from pool → approve → vault deposit → return burner key
        // params: mnemonic, apiKey, vaultAddress, token, amount
        const { mnemonic, apiKey: ak, vaultAddress, token, amount } = params;
        const apiClient = createUnlinkClient(ENGINE_URL, ak);
        const account = unlinkAccount.fromMnemonic({ mnemonic });
        const accountKeys = await account.getAccountKeys();
        const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });

        // 1. Create burner wallet with custom storage to capture private key
        const burnerStore = {
          _keys: new Map(),
          async save(addr, pk) { this._keys.set(addr.toLowerCase(), pk); },
          async load(addr) { return this._keys.get(addr.toLowerCase()) ?? null; },
          async delete(addr) { this._keys.delete(addr.toLowerCase()); },
        };
        console.error("[earn-deposit] Creating burner wallet...");
        const burner = await BurnerWallet.create(burnerStore);
        console.error(`[earn-deposit] Burner: ${burner.address}`);

        // 2. Fund burner from privacy pool
        console.error("[earn-deposit] Funding burner from pool...");
        const fundResult = await burner.fundFromPool(apiClient, {
          senderKeys: accountKeys, token, amount, environment: "base-sepolia",
        });

        // Poll fund tx
        for (let i = 0; i < 60; i++) {
          const tx = await getTransaction(apiClient, fundResult.txId);
          if (tx.status === "confirmed" || tx.status === "relayed") break;
          if (tx.status === "failed" || tx.status === "rejected") throw new Error("Fund tx failed: " + tx.status);
          await new Promise(r => setTimeout(r, 5000));
        }

        // Wait for gas funding from relayer
        console.error("[earn-deposit] Waiting for gas funding...");
        for (let i = 0; i < 30; i++) {
          const s = await burner.getStatus(apiClient);
          if (s.status === "funded") { console.error("[earn-deposit] Burner funded"); break; }
          if (s.status === "gas_funding_failed") throw new Error("Gas funding failed");
          await new Promise(r => setTimeout(r, 5000));
        }

        // 3. Approve USDC to vault from burner
        console.error("[earn-deposit] Approving USDC to vault...");
        const burnerViemAccount = burner.toViemAccount();
        const approveWC = createWalletClient({
          account: burnerViemAccount, chain: baseSepolia, transport: http(RPC_URL),
        });
        const approveTx = await approveWC.writeContract({
          address: token, abi: erc20Abi, functionName: "approve",
          args: [vaultAddress, BigInt(amount)],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 });

        // Verify allowance is actually set before proceeding
        for (let i = 0; i < 10; i++) {
          const allowance = await publicClient.readContract({
            address: token, abi: erc20Abi, functionName: "allowance",
            args: [burnerViemAccount.address, vaultAddress],
          });
          if (allowance >= BigInt(amount)) {
            console.error(`[earn-deposit] Approval verified: ${allowance}`);
            break;
          }
          console.error(`[earn-deposit] Waiting for allowance... (${allowance})`);
          await new Promise(r => setTimeout(r, 2000));
        }

        // 4. Deposit into vault — fresh walletClient to avoid stale nonce
        console.error("[earn-deposit] Depositing into vault...");
        const depositWC = createWalletClient({
          account: burnerViemAccount, chain: baseSepolia, transport: http(RPC_URL),
        });
        const VAULT_DEPOSIT_ABI = [{ inputs: [{ type: "uint256", name: "amount" }], name: "deposit", outputs: [], stateMutability: "nonpayable", type: "function" }];
        const vaultTx = await depositWC.writeContract({
          address: vaultAddress, abi: VAULT_DEPOSIT_ABI, functionName: "deposit",
          args: [BigInt(amount)],
        });
        await publicClient.waitForTransactionReceipt({ hash: vaultTx });
        console.error("[earn-deposit] Vault deposit confirmed");

        // 5. Check lpUSD balance on burner
        const LP_BAL_ABI = [{ inputs: [{ type: "address", name: "account" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }];
        const lpBalance = await publicClient.readContract({
          address: vaultAddress, abi: LP_BAL_ABI, functionName: "balanceOf", args: [burner.address],
        });

        // Return burner private key so API can encrypt & store it in DB
        const burnerPrivateKey = await burnerStore.load(burner.address);

        result = {
          burnerAddress: burner.address,
          burnerPrivateKey,
          vaultTxHash: vaultTx,
          lpBalance: lpBalance.toString(),
          fundTxId: fundResult.txId,
        };
        break;
      }

      case "earn-withdraw": {
        // Restore burner → vault withdraw → approve Permit2 → deposit back to pool
        // params: mnemonic, apiKey, vaultAddress, token, amount, burnerPrivateKey
        const { mnemonic, apiKey: ak, vaultAddress, token, amount, burnerPrivateKey } = params;
        const apiClient = createUnlinkClient(ENGINE_URL, ak);
        const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });

        // Restore burner from its private key
        const burnerAccount = privateKeyToAccount(burnerPrivateKey);
        console.error(`[earn-withdraw] Using burner: ${burnerAccount.address}`);

        // 1. Withdraw from vault (burn lpUSD → get USDC on burner)
        console.error("[earn-withdraw] Withdrawing from vault...");
        const vaultWC = createWalletClient({
          account: burnerAccount, chain: baseSepolia, transport: http(RPC_URL),
        });
        const VAULT_WITHDRAW_ABI = [{ inputs: [{ type: "uint256", name: "amount" }], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" }];
        const withdrawTx = await vaultWC.writeContract({
          address: vaultAddress, abi: VAULT_WITHDRAW_ABI, functionName: "withdraw",
          args: [BigInt(amount)],
        });
        await publicClient.waitForTransactionReceipt({ hash: withdrawTx, confirmations: 1 });
        console.error("[earn-withdraw] Vault withdrawal confirmed");

        // 2. Approve Permit2 from burner — fresh walletClient
        console.error("[earn-withdraw] Approving Permit2...");
        const info = await BurnerWallet.getInfo(apiClient);
        const approveWC = createWalletClient({
          account: burnerAccount, chain: baseSepolia, transport: http(RPC_URL),
        });
        const approveP2Tx = await approveWC.writeContract({
          address: token, abi: erc20Abi, functionName: "approve",
          args: [info.permit2_address, BigInt(amount)],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveP2Tx, confirmations: 1 });
        console.error("[earn-withdraw] Permit2 approved");

        // 3. Deposit USDC back to privacy pool from burner
        console.error("[earn-withdraw] Depositing back to pool...");
        const hlClient = createUnlink({
          engineUrl: ENGINE_URL, apiKey: ak,
          account: unlinkAccount.fromMnemonic({ mnemonic }),
        });
        await hlClient.ensureRegistered();
        const unlinkAddr = await hlClient.getAddress();

        const nonce = await getPermit2Nonce(apiClient, burnerAccount.address);
        const signWC = createWalletClient({
          account: burnerAccount, chain: baseSepolia, transport: http(RPC_URL),
        });
        const { deposit: sdkDeposit } = await import("@unlink-xyz/sdk");
        const depResult = await sdkDeposit(apiClient, {
          unlinkAddress: unlinkAddr,
          evmAddress: burnerAccount.address,
          token, amount, environment: "base-sepolia",
          nonce,
          deadline: Math.floor(Date.now() / 1000) + 3600,
          chainId: info.chain_id,
          permit2Address: info.permit2_address,
          poolAddress: info.pool_address,
          signTypedData: async (typedData) => {
            return signWC.signTypedData({
              domain: typedData.domain,
              types: typedData.types,
              primaryType: typedData.primaryType,
              message: typedData.value,
            });
          },
        });

        // Poll deposit
        for (let i = 0; i < 60; i++) {
          const tx = await getTransaction(apiClient, depResult.txId);
          if (tx.status === "confirmed" || tx.status === "relayed") break;
          if (tx.status === "failed" || tx.status === "rejected") throw new Error("Deposit back failed: " + tx.status);
          await new Promise(r => setTimeout(r, 5000));
        }
        console.error("[earn-withdraw] Pool deposit confirmed");

        result = {
          withdrawTxHash: withdrawTx,
          poolDepositTxId: depResult.txId,
          burnerAddress: burnerAccount.address,
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
