import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { EARN_VAULT_ADDRESS, EARN_VAULT_ABI } from "@/lib/contracts";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import Burner from "@/lib/models/burner";

// GET /api/earn/balance — get user's own lpUSD balance + vault TVL
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.RPC_URL || "https://sepolia.base.org"),
    });

    // Always show only the logged-in user's own burners
    const burners = await Burner.find({
      userId: user._id,
      vaultAddress: EARN_VAULT_ADDRESS,
      status: "active",
    });

    // Sum lpUSD balance across user's active burners
    let totalLp = 0n;
    for (const b of burners) {
      const bal = await publicClient.readContract({
        address: EARN_VAULT_ADDRESS as `0x${string}`,
        abi: EARN_VAULT_ABI,
        functionName: "balanceOf",
        args: [b.address as `0x${string}`],
      }) as bigint;
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
