import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { earnBalance } from "@/lib/unlink-worker";
import { EARN_VAULT_ADDRESS } from "@/lib/contracts";
import { formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// GET /api/earn/balance — get lpUSD balance + vault TVL
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const deployerKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY) as `0x${string}`;
    const deployerAddress = privateKeyToAccount(deployerKey).address;

    const result = await earnBalance({
      vaultAddress: EARN_VAULT_ADDRESS,
      address: deployerAddress,
    });

    return NextResponse.json({
      lpBalance: formatUnits(BigInt(result.lpBalance || "0"), 6),
      totalDeposits: formatUnits(BigInt(result.totalDeposits || "0"), 6),
      vaultAddress: EARN_VAULT_ADDRESS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
