import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { unlinkWithdraw, UNLINK_USDC } from "@/lib/unlink-worker";
import { logAction } from "@/lib/audit";
import Organization from "@/lib/models/organization";

// POST /api/treasury/withdraw — withdraw from privacy pool to EVM address
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { amount, recipientEvmAddress } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }

    await connectDB();

    const org = await Organization.findById(admin.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const mnemonic = decrypt(admin.encryptedMnemonic);
    const recipient = recipientEvmAddress || admin.evmAddress;
    const amountInUnits = (parseFloat(amount) * 1e6).toFixed(0);

    console.log(`[Withdraw] Withdrawing ${amount} USDC to ${recipient}`);

    const result = await unlinkWithdraw({
      mnemonic,
      token: UNLINK_USDC,
      amount: amountInUnits,
      recipientEvmAddress: recipient,
    });

    await logAction({
      organizationId: org._id.toString(),
      userId: admin._id.toString(),
      userName: admin.name || admin.email || "Admin",
      action: "Pool withdrawal",
      details: `Withdrew $${amount} USDC from privacy pool to ${recipient}. TX: ${result.txId}`,
    });

    return NextResponse.json({
      txId: result.txId,
      status: result.status,
      amount,
      message: "Withdrawn from privacy pool",
    });
  } catch (error) {
    console.error("Withdraw error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
