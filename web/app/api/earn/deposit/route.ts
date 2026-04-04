import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { earnDeposit, UNLINK_USDC } from "@/lib/unlink-worker";
import { EARN_VAULT_ADDRESS } from "@/lib/contracts";
import { logAction } from "@/lib/audit";
import Burner from "@/lib/models/burner";

// POST /api/earn/deposit — move funds from privacy pool into yield vault via BurnerWallet
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

    console.log(`[Earn Deposit] ${amount} USDC → vault for ${user.name || user.email}`);

    const result = await earnDeposit({
      mnemonic,
      vaultAddress: EARN_VAULT_ADDRESS,
      token: UNLINK_USDC,
      amount: amountInUnits,
    });

    // Store burner wallet in DB (encrypted private key)
    await Burner.create({
      userId: user._id,
      address: result.burnerAddress,
      encryptedPrivateKey: encrypt(result.burnerPrivateKey),
      vaultAddress: EARN_VAULT_ADDRESS,
      token: UNLINK_USDC,
      amount: amountInUnits,
      status: "active",
    });

    if (user.organizationId) {
      await logAction({
        organizationId: user.organizationId.toString(),
        userId: user._id.toString(),
        userName: user.name || user.email || "User",
        action: "Earn deposit",
        details: `Deposited $${amount} USDC into yield vault via burner ${result.burnerAddress}`,
      });
    }

    return NextResponse.json({
      vaultTxHash: result.vaultTxHash,
      lpBalance: result.lpBalance,
      burnerAddress: result.burnerAddress,
      amount,
      message: "Deposited into yield vault via BurnerWallet",
    });
  } catch (error) {
    console.error("Earn deposit error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
