import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import Organization from "@/lib/models/organization";

// GET /api/me/balance — employee's Unlink balance
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const org = await Organization.findById(user.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const mnemonic = decrypt(user.encryptedMnemonic);
    const unlink = createUnlinkClient(mnemonic);

    const balances = await unlink.getBalances({ token: org.tokenAddress });

    return NextResponse.json({
      unlinkAddress: user.unlinkAddress,
      tokenSymbol: org.tokenSymbol,
      tokenDecimals: org.tokenDecimals,
      balances,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
