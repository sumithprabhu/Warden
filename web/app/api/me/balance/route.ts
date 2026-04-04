import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { getUnlinkBalances, UNLINK_USDC } from "@/lib/unlink-worker";
import { formatUnits } from "viem";

// GET /api/me/balance — employee's private Unlink balance
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const mnemonic = decrypt(user.encryptedMnemonic);

    let balance = "0";
    try {
      const result = await getUnlinkBalances(mnemonic);
      const usdcBal = result.balances?.find(
        (b: any) => b.token.toLowerCase() === UNLINK_USDC.toLowerCase()
      );
      if (usdcBal) {
        balance = formatUnits(BigInt(usdcBal.amount), 6);
      }
    } catch (err) {
      console.warn("Failed to get Unlink balance:", (err as Error).message);
    }

    return NextResponse.json({
      unlinkAddress: user.unlinkAddress,
      balance,
      token: "USDC",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
