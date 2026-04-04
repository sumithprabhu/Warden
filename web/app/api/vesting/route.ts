import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Vesting from "@/lib/models/vesting";
import "@/lib/models/user";

// GET /api/vesting — list all vesting schedules
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    await connectDB();

    const vestings = await Vesting.find({
      organizationId: admin.organizationId,
    })
      .populate("employeeUserId", "name email ensName")
      .sort({ createdAt: -1 });

    return NextResponse.json({ vestings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/vesting — create vesting schedule
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { employeeUserId, totalAmount, cliffMonths, vestingMonths, startDate } = body;

    if (!employeeUserId || !totalAmount || cliffMonths === undefined || !vestingMonths || !startDate) {
      return NextResponse.json(
        { error: "employeeUserId, totalAmount, cliffMonths, vestingMonths, and startDate are required" },
        { status: 400 },
      );
    }

    await connectDB();

    const vesting = await Vesting.create({
      organizationId: admin.organizationId,
      employeeUserId,
      totalAmount,
      cliffMonths,
      vestingMonths,
      startDate: new Date(startDate),
    });

    return NextResponse.json({ vesting }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
