import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { requireAuth } from "@/lib/auth";

const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const GAS_AMOUNT = "0.005"; // 0.005 ETH per request — enough for ~50 transactions

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user.evmAddress) {
      return NextResponse.json({ error: "No wallet address found" }, { status: 400 });
    }

    const deployerKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY) as `0x${string}`;
    const account = privateKeyToAccount(deployerKey);

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    // Check if user already has enough gas
    const balance = await publicClient.getBalance({ address: user.evmAddress as `0x${string}` });
    if (balance > parseEther("0.003")) {
      return NextResponse.json({
        message: "Wallet already has enough gas",
        balance: formatEther(balance),
      });
    }

    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const hash = await walletClient.sendTransaction({
      to: user.evmAddress as `0x${string}`,
      value: parseEther(GAS_AMOUNT),
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      message: `Sent ${GAS_AMOUNT} ETH for gas`,
      hash,
      to: user.evmAddress,
    });
  } catch (error) {
    console.error("Faucet error:", error);
    return NextResponse.json({ error: "Failed to send gas" }, { status: 500 });
  }
}
