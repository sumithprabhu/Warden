import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Vesting from "@/lib/models/vesting";

// GET /api/me/vesting — employee's vesting schedules
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const vestings = await Vesting.find({
      employeeUserId: user._id,
      status: { $ne: "CANCELLED" },
    }).sort({ startDate: -1 });

    // Calculate vested amounts
    const now = new Date();
    const result = vestings.map((v) => {
      const startMs = v.startDate.getTime();
      const cliffMs = v.cliffMonths * 30 * 24 * 60 * 60 * 1000;
      const vestingMs = v.vestingMonths * 30 * 24 * 60 * 60 * 1000;
      const elapsed = now.getTime() - startMs;

      let vestedAmount = "0";
      let cliffReached = false;

      if (elapsed >= cliffMs) {
        cliffReached = true;
        const vestingElapsed = Math.min(elapsed - cliffMs, vestingMs - cliffMs);
        const vestingProgress = vestingMs > cliffMs ? vestingElapsed / (vestingMs - cliffMs) : 1;
        const vested = (BigInt(v.totalAmount) * BigInt(Math.floor(vestingProgress * 10000))) / BigInt(10000);
        vestedAmount = vested.toString();
      }

      return {
        id: v._id,
        totalAmount: v.totalAmount,
        releasedAmount: v.releasedAmount,
        vestedAmount,
        cliffReached,
        cliffMonths: v.cliffMonths,
        vestingMonths: v.vestingMonths,
        startDate: v.startDate,
        status: v.status,
      };
    });

    return NextResponse.json({ vestings: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
