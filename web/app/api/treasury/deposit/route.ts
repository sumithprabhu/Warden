import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { unlinkDeposit, UNLINK_USDC } from "@/lib/unlink-worker";
import { logAction } from "@/lib/audit";
import Organization from "@/lib/models/organization";

// POST /api/treasury/deposit — deposit USDC into Unlink privacy pool
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { amount } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }

    await connectDB();

    const org = await Organization.findById(admin.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    console.log("[Deposit] ▶ Starting deposit of $" + amount + " USDC into privacy pool");
    console.log("[Deposit] Admin:", admin.name || admin.email);
    const mnemonic = decrypt(admin.encryptedMnemonic);
    const evmPrivateKey = (process.env.DEPLOYER_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY) as string;

    // Convert human amount to USDC units (6 decimals)
    const amountInUnits = (parseFloat(amount) * 1e6).toFixed(0);

    console.log(`[Deposit] Depositing ${amount} USDC (${amountInUnits} units) into Unlink pool`);

    const result = await unlinkDeposit({
      mnemonic,
      evmPrivateKey,
      token: UNLINK_USDC,
      amount: amountInUnits,
    });

    console.log(`[Deposit] Result:`, result);

    await logAction({
      organizationId: org._id.toString(),
      userId: admin._id.toString(),
      userName: admin.name || admin.email || "Admin",
      action: "Pool deposit",
      details: `Deposited $${amount} USDC into privacy pool. TX: ${result.txId}`,
    });

    return NextResponse.json({
      txId: result.txId,
      status: result.status,
      amount,
      message: "Deposited into privacy pool successfully",
    });
  } catch (error) {
    console.error("Deposit error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
