import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Payroll from "@/lib/models/payroll";
import Payment from "@/lib/models/payment";

// GET /api/payroll/[id] — payroll details + payments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    await connectDB();

    const payroll = await Payroll.findOne({
      _id: id,
      organizationId: admin.organizationId,
    }).populate("departmentId", "name");

    if (!payroll) {
      return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
    }

    const payments = await Payment.find({ payrollId: payroll._id })
      .populate("employeeUserId", "name email ensName unlinkAddress");

    return NextResponse.json({ payroll, payments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
