import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Payment from "@/lib/models/payment";

// GET /api/me/payments — employee's payment history
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const page = parseInt(url.searchParams.get("page") || "1");

    const payments = await Payment.find({ employeeUserId: user._id })
      .populate("payrollId", "status executedAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Payment.countDocuments({ employeeUserId: user._id });

    return NextResponse.json({
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
