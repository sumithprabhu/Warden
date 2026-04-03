import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import Organization from "@/lib/models/organization";
import Vesting from "@/lib/models/vesting";
import User from "@/lib/models/user";

// POST /api/vesting/[id]/release — trigger vested token release
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    await connectDB();

    const vesting = await Vesting.findOne({
      _id: id,
      organizationId: admin.organizationId,
      status: "ACTIVE",
    });

    if (!vesting) {
      return NextResponse.json({ error: "Vesting schedule not found" }, { status: 404 });
    }

    const org = await Organization.findById(admin.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Calculate vested but unreleased amount
    const now = new Date();
    const startMs = vesting.startDate.getTime();
    const cliffMs = vesting.cliffMonths * 30 * 24 * 60 * 60 * 1000;
    const vestingMs = vesting.vestingMonths * 30 * 24 * 60 * 60 * 1000;
    const elapsed = now.getTime() - startMs;

    if (elapsed < cliffMs) {
      return NextResponse.json({ error: "Cliff period not reached" }, { status: 400 });
    }

    const vestingElapsed = Math.min(elapsed - cliffMs, vestingMs - cliffMs);
    const vestingProgress = vestingMs > cliffMs ? vestingElapsed / (vestingMs - cliffMs) : 1;
    const totalVested = (BigInt(vesting.totalAmount) * BigInt(Math.floor(vestingProgress * 10000))) / BigInt(10000);
    const alreadyReleased = BigInt(vesting.releasedAmount);
    const toRelease = totalVested - alreadyReleased;

    if (toRelease <= BigInt(0)) {
      return NextResponse.json({ error: "No new tokens to release" }, { status: 400 });
    }

    // Get employee's Unlink address
    const employee = await User.findById(vesting.employeeUserId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Execute private transfer
    const mnemonic = decrypt(admin.encryptedMnemonic);
    const unlink = createUnlinkClient(mnemonic);

    const result = await unlink.transfer({
      recipientAddress: employee.unlinkAddress!,
      token: org.tokenAddress,
      amount: toRelease.toString(),
    });

    await unlink.pollTransactionStatus(result.txId);

    // Update released amount
    vesting.releasedAmount = (alreadyReleased + toRelease).toString();
    if (vesting.releasedAmount === vesting.totalAmount) {
      vesting.status = "COMPLETED";
    }
    await vesting.save();

    return NextResponse.json({
      released: toRelease.toString(),
      totalReleased: vesting.releasedAmount,
      totalAmount: vesting.totalAmount,
      status: vesting.status,
      txId: result.txId,
    });
  } catch (error) {
    console.error("Vesting release error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
