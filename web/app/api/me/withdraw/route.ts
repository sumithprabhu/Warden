import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import { resolveENS, isENSName } from "@/lib/ens";
import Organization from "@/lib/models/organization";

// POST /api/me/withdraw — employee withdraws to EVM wallet
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { amount, recipientEvmAddress } = await req.json();

    if (!amount || !recipientEvmAddress) {
      return NextResponse.json(
        { error: "amount and recipientEvmAddress are required" },
        { status: 400 },
      );
    }

    await connectDB();

    const org = await Organization.findById(user.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Resolve ENS name if provided
    let resolvedAddress = recipientEvmAddress;
    if (isENSName(recipientEvmAddress)) {
      const resolved = await resolveENS(recipientEvmAddress);
      if (!resolved) {
        return NextResponse.json({ error: "Could not resolve ENS name" }, { status: 400 });
      }
      resolvedAddress = resolved;
    }

    const mnemonic = decrypt(user.encryptedMnemonic);
    const unlink = createUnlinkClient(mnemonic);

    const withdrawal = await unlink.withdraw({
      recipientEvmAddress: resolvedAddress,
      token: org.tokenAddress,
      amount,
    });

    const confirmed = await unlink.pollTransactionStatus(withdrawal.txId);

    return NextResponse.json({
      txId: withdrawal.txId,
      status: confirmed,
    });
  } catch (error) {
    console.error("Employee withdraw error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
