import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import Organization from "@/lib/models/organization";

// POST /api/treasury/withdraw — withdraw tokens from privacy pool
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
    const unlink = createUnlinkClient(mnemonic);

    // Default to admin's EVM address if not specified
    const recipient = recipientEvmAddress || admin.evmAddress;

    const withdrawal = await unlink.withdraw({
      recipientEvmAddress: recipient,
      token: org.tokenAddress,
      amount,
    });

    const confirmed = await unlink.pollTransactionStatus(withdrawal.txId);

    return NextResponse.json({
      txId: withdrawal.txId,
      status: confirmed,
    });
  } catch (error) {
    console.error("Withdraw error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
