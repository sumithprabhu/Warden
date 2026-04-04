import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getUnlinkBalances, UNLINK_USDC } from "@/lib/unlink-worker";
import Organization from "@/lib/models/organization";
import { formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// GET /api/treasury/balance — get Unlink pool balance + on-chain treasury balance
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    await connectDB();

    const org = await Organization.findById(admin.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get Unlink privacy pool balance (the actual private balance)
    let poolBalance = "0";
    try {
      const mnemonic = decrypt(admin.encryptedMnemonic);
      const unlinkBal = await getUnlinkBalances(mnemonic);
      const usdcBal = unlinkBal.balances?.find(
        (b: any) => b.token.toLowerCase() === UNLINK_USDC.toLowerCase()
      );
      if (usdcBal) {
        poolBalance = formatUnits(BigInt(usdcBal.amount), 6);
      }
    } catch (err) {
      console.warn("Failed to get Unlink balance:", (err as Error).message);
    }

    // Funding address — where users send USDC before depositing into pool
    const deployerKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY) as `0x${string}`;
    const fundingAddress = privateKeyToAccount(deployerKey).address;

    return NextResponse.json({
      poolBalance,
      poolToken: UNLINK_USDC,
      fundingAddress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
