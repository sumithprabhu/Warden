import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { unlinkWithdraw, UNLINK_USDC } from "@/lib/unlink-worker";
import { resolveENS, isENSName } from "@/lib/ens";

// POST /api/me/withdraw — employee withdraws from privacy pool to EVM wallet
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { amount, recipientEvmAddress } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }

    // Default to user's own wallet if no address provided
    let resolvedAddress = recipientEvmAddress || user.evmAddress;

    if (!resolvedAddress) {
      return NextResponse.json({ error: "No wallet address. Set one in your profile." }, { status: 400 });
    }

    // Resolve ENS name if provided
    if (isENSName(resolvedAddress)) {
      const resolved = await resolveENS(resolvedAddress);
      if (!resolved) {
        return NextResponse.json({ error: "Could not resolve ENS name" }, { status: 400 });
      }
      resolvedAddress = resolved;
    }

    const mnemonic = decrypt(user.encryptedMnemonic);
    const amountInUnits = (parseFloat(amount) * 1e6).toFixed(0);

    console.log(`[Employee Withdraw] ${amount} USDC to ${resolvedAddress}`);

    const result = await unlinkWithdraw({
      mnemonic,
      token: UNLINK_USDC,
      amount: amountInUnits,
      recipientEvmAddress: resolvedAddress,
    });

    return NextResponse.json({
      txId: result.txId,
      status: result.status,
      amount,
      message: "Withdrawal from privacy pool submitted",
    });
  } catch (error) {
    console.error("Employee withdraw error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
