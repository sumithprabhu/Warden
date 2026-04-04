import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Payment from "@/lib/models/payment";
import Organization from "@/lib/models/organization";
import Employee from "@/lib/models/employee";

// GET /api/me/payslip?id=<paymentId> — get payslip data for a payment
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectDB();

    const url = new URL(req.url);
    const paymentId = url.searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      employeeUserId: user._id,
    }).populate("payrollId", "status executedAt");

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const org = await Organization.findById(user.organizationId);
    const employee = await Employee.findOne({ userId: user._id, organizationId: user.organizationId });

    return NextResponse.json({
      payslip: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        date: payment.createdAt,
        txId: payment.unlinkTxId,
        employee: {
          name: user.name || "Employee",
          email: user.email,
          type: employee?.employeeType || "FULL_TIME",
          salary: employee?.salary,
          frequency: employee?.payFrequency || "MONTHLY",
        },
        organization: {
          name: org?.name || "Organization",
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
