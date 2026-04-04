import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.RPC_URL || "https://sepolia.base.org"),
});

const erc20Abi = [
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address || !address.startsWith("0x")) {
      return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
    }

    const tokenAddress = address as `0x${string}`;

    const [name, symbol, decimals] = await Promise.all([
      publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "name" }),
      publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "symbol" }),
      publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" }),
    ]);

    return NextResponse.json({ address, name, symbol, decimals: Number(decimals) });
  } catch (error) {
    console.error("Token lookup error:", error);
    return NextResponse.json({ error: "Could not fetch token details. Is the address a valid ERC-20 on Base Sepolia?" }, { status: 400 });
  }
}
