import { execFile } from "child_process";
import path from "path";
import { existsSync } from "fs";

// Resolve worker path — try multiple locations for dev vs Vercel
const CWD = process.cwd();
const CANDIDATES = [
  path.resolve(CWD, "workers", "unlink-op.mjs"),
  path.resolve(CWD, "web", "workers", "unlink-op.mjs"),
  path.resolve("/var/task/web/workers/unlink-op.mjs"),
  path.resolve("/var/task/workers/unlink-op.mjs"),
];
const WORKER_PATH = CANDIDATES.find((p) => existsSync(p)) || CANDIDATES[0];

// Resolve node_modules path for the worker's NODE_PATH
const NODE_MODULES = [
  path.resolve(CWD, "node_modules"),
  path.resolve(CWD, "web", "node_modules"),
  path.resolve("/var/task/web/node_modules"),
  path.resolve("/var/task/node_modules"),
].filter((p) => existsSync(p)).join(":");
const API_KEY = process.env.UNLINK_API_KEY!;

// Real USDC on Base Sepolia — the only token Unlink's pool supports
export const UNLINK_USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

interface UnlinkResult {
  error?: boolean;
  message?: string;
  [key: string]: any;
}

function runWorker(operation: string, params: Record<string, any>): Promise<UnlinkResult> {
  return new Promise((resolve, reject) => {
    const paramsWithKey = { ...params, apiKey: API_KEY };

    execFile(
      "node",
      [WORKER_PATH, operation, JSON.stringify(paramsWithKey)],
      { timeout: 360000, env: { ...process.env, NODE_PATH: NODE_MODULES } }, // 6 min timeout
      (error, stdout, stderr) => {
        if (stderr) console.error("Unlink worker stderr:", stderr);

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            reject(new Error(result.message || "Unlink operation failed"));
          } else {
            resolve(result);
          }
        } catch {
          if (error) {
            reject(new Error(`Unlink worker failed: ${error.message}`));
          } else {
            reject(new Error(`Invalid worker output: ${stdout}`));
          }
        }
      }
    );
  });
}

export async function getUnlinkAddress(mnemonic: string): Promise<string> {
  const result = await runWorker("get-address", { mnemonic });
  return result.address;
}

export async function registerUnlinkUser(mnemonic: string): Promise<string> {
  const result = await runWorker("register", { mnemonic });
  return result.address;
}

export async function getUnlinkBalances(mnemonic: string, token?: string) {
  return runWorker("get-balances", { mnemonic, token });
}

export async function unlinkDeposit(params: {
  mnemonic: string;
  evmPrivateKey: string;
  token: string;
  amount: string;
}) {
  return runWorker("deposit", params);
}

export async function unlinkTransfer(params: {
  mnemonic: string;
  token: string;
  recipientAddress?: string;
  amount?: string;
  transfers?: Array<{ recipientAddress: string; amount: string }>;
}) {
  return runWorker("transfer", params);
}

export async function unlinkTransferAndPoll(params: {
  mnemonic: string;
  token: string;
  recipientAddress?: string;
  amount?: string;
  transfers?: Array<{ recipientAddress: string; amount: string }>;
}) {
  return runWorker("transfer-and-poll", params);
}

export async function unlinkWithdraw(params: {
  mnemonic: string;
  token: string;
  amount: string;
  recipientEvmAddress: string;
}) {
  return runWorker("withdraw", params);
}

export async function getUnlinkTransactions(mnemonic: string) {
  return runWorker("get-transactions", { mnemonic });
}

export async function getUnlinkEnvironment() {
  return runWorker("get-environment", {});
}

export async function earnDeposit(params: {
  mnemonic: string;
  vaultAddress: string;
  token: string;
  amount: string;
}) {
  return runWorker("earn-deposit", params);
}

export async function earnWithdraw(params: {
  mnemonic: string;
  vaultAddress: string;
  token: string;
  amount: string;
  burnerPrivateKey: string;
}) {
  return runWorker("earn-withdraw", params);
}

export async function earnBalance(params: {
  vaultAddress: string;
  address?: string;
}) {
  return runWorker("earn-balance", params);
}
