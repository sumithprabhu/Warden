import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { EARN_VAULT_ADDRESS, EARN_VAULT_ABI } from "@/lib/contracts";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import Burner from "@/lib/models/burner";

// GET /api/earn/balance — get lpUSD balance across user's burners + vault TVL
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.RPC_URL || "https://sepolia.base.org"),
    });

    // Find all active burners for this user
    const burners = await Burner.find({
      userId: user._id,
      vaultAddress: EARN_VAULT_ADDRESS,
      status: "active",
    });

    console.log(`[Earn Balance] User: ${user._id}, found ${burners.length} active burners`);

    // Sum lpUSD balance across all active burners
    let totalLp = 0n;
    for (const b of burners) {
      console.log(`[Earn Balance] Checking burner ${b.address}...`);
      const bal = await publicClient.readContract({
        address: EARN_VAULT_ADDRESS as `0x${string}`,
        abi: EARN_VAULT_ABI,
        functionName: "balanceOf",
        args: [b.address as `0x${string}`],
      }) as bigint;
      console.log(`[Earn Balance] Burner ${b.address} lpUSD: ${bal}`);
      totalLp += bal;
    }

    // Vault TVL
    const totalDeposits = await publicClient.readContract({
      address: EARN_VAULT_ADDRESS as `0x${string}`,
      abi: EARN_VAULT_ABI,
      functionName: "totalDeposits",
    }) as bigint;

    return NextResponse.json({
      lpBalance: formatUnits(totalLp, 6),
      totalDeposits: formatUnits(totalDeposits, 6),
      vaultAddress: EARN_VAULT_ADDRESS,
      activeBurners: burners.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
