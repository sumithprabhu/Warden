import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { earnWithdraw, UNLINK_USDC } from "@/lib/unlink-worker";
import { EARN_VAULT_ADDRESS } from "@/lib/contracts";
import { logAction } from "@/lib/audit";

// POST /api/earn/withdraw — withdraw from yield vault back to privacy pool
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { amount } = await req.json();

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    await connectDB();

    const mnemonic = decrypt(user.encryptedMnemonic);
    const amountInUnits = (parseFloat(amount) * 1e6).toFixed(0);

    console.log(`[Earn Withdraw] ${amount} USDC from vault for ${user.name || user.email}`);

    const result = await earnWithdraw({
      mnemonic,
      vaultAddress: EARN_VAULT_ADDRESS,
      token: UNLINK_USDC,
      amount: amountInUnits,
    });

    if (user.organizationId) {
      await logAction({
        organizationId: user.organizationId.toString(),
        userId: user._id.toString(),
        userName: user.name || user.email || "User",
        action: "Earn withdraw",
        details: `Withdrew $${amount} USDC from yield vault back to privacy pool.`,
      });
    }

    return NextResponse.json({
      withdrawTxHash: result.withdrawTxHash,
      poolDepositTxId: result.poolDepositTxId,
      amount,
      message: "Withdrawn from vault, funds back in privacy pool",
    });
  } catch (error) {
    console.error("Earn withdraw error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
