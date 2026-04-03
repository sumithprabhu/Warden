import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import Organization from "@/lib/models/organization";

// GET /api/treasury/balance — get Unlink pool + EVM wallet balance
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    await connectDB();

    const org = await Organization.findById(admin.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Use admin's mnemonic to check org treasury balance
    const mnemonic = decrypt(admin.encryptedMnemonic);
    const unlink = createUnlinkClient(mnemonic);

    const balances = await unlink.getBalances({ token: org.tokenAddress });

    return NextResponse.json({
      tokenAddress: org.tokenAddress,
      tokenSymbol: org.tokenSymbol,
      tokenDecimals: org.tokenDecimals,
      balances,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
