import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import Organization from "@/lib/models/organization";

// POST /api/treasury/deposit — deposit tokens into privacy pool
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

    const mnemonic = decrypt(admin.encryptedMnemonic);
    const unlink = createUnlinkClient(mnemonic);

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.RPC_URL),
    });

    // Ensure ERC-20 approval for Permit2
    const approval = await unlink.ensureErc20Approval({
      token: org.tokenAddress,
      amount,
    });

    if (approval.status === "submitted") {
      await publicClient.waitForTransactionReceipt({
        hash: approval.txHash as `0x${string}`,
      });
    }

    // Deposit into privacy pool
    const deposit = await unlink.deposit({
      token: org.tokenAddress,
      amount,
    });

    // Poll for completion
    const confirmed = await unlink.pollTransactionStatus(deposit.txId);

    return NextResponse.json({
      txId: deposit.txId,
      status: confirmed,
    });
  } catch (error) {
    console.error("Deposit error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
