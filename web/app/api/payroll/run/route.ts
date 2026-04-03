import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import Organization from "@/lib/models/organization";
import Employee from "@/lib/models/employee";
import User from "@/lib/models/user";
import Payroll from "@/lib/models/payroll";
import Payment from "@/lib/models/payment";

// POST /api/payroll/run — execute payroll (or submit for DAO approval)
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { departmentId } = body;

    await connectDB();

    const org = await Organization.findById(admin.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get active employees (optionally filtered by department)
    const filter: Record<string, unknown> = {
      organizationId: admin.organizationId,
      isActive: true,
    };
    if (departmentId) filter.departmentId = departmentId;

    const employees = await Employee.find(filter).populate("userId");

    if (employees.length === 0) {
      return NextResponse.json({ error: "No active employees found" }, { status: 400 });
    }

    // Calculate total
    const totalAmount = employees.reduce(
      (sum, emp) => sum + BigInt(emp.salary),
      BigInt(0),
    ).toString();

    // Create payroll record
    const payroll = await Payroll.create({
      organizationId: admin.organizationId,
      departmentId: departmentId || undefined,
      status: org.orgType === "DAO" ? "PENDING_APPROVAL" : "PROCESSING",
      totalAmount,
      employeeCount: employees.length,
    });

    // Create individual payment records
    const payments = await Payment.insertMany(
      employees.map((emp) => ({
        payrollId: payroll._id,
        employeeUserId: emp.userId._id,
        amount: emp.salary,
        status: "PENDING",
      })),
    );

    // If DAO mode, wait for approvals
    if (org.orgType === "DAO") {
      return NextResponse.json({
        payroll: {
          id: payroll._id,
          status: "PENDING_APPROVAL",
          totalAmount,
          employeeCount: employees.length,
          requiredApprovals: org.approvers.length,
        },
      });
    }

    // Execute multi-recipient transfer
    const mnemonic = decrypt(admin.encryptedMnemonic);
    const unlink = createUnlinkClient(mnemonic);

    const transfers = await Promise.all(
      employees.map(async (emp) => {
        const user = emp.userId as unknown as { unlinkAddress: string };
        return {
          recipientAddress: user.unlinkAddress,
          amount: emp.salary,
        };
      }),
    );

    try {
      const result = await unlink.transfer({
        token: org.tokenAddress,
        transfers,
      });

      payroll.unlinkTxId = result.txId;
      payroll.status = "PROCESSING";
      await payroll.save();

      // Poll for completion
      const confirmed = await unlink.pollTransactionStatus(result.txId);

      // Update statuses
      payroll.status = "COMPLETED";
      payroll.executedAt = new Date();
      await payroll.save();

      await Payment.updateMany(
        { payrollId: payroll._id },
        { status: "COMPLETED", unlinkTxId: result.txId },
      );

      return NextResponse.json({
        payroll: {
          id: payroll._id,
          status: "COMPLETED",
          totalAmount,
          employeeCount: employees.length,
          unlinkTxId: result.txId,
          executedAt: payroll.executedAt,
        },
      });
    } catch (txError) {
      // Mark as failed
      payroll.status = "FAILED";
      await payroll.save();
      await Payment.updateMany(
        { payrollId: payroll._id },
        { status: "FAILED" },
      );

      console.error("Payroll transfer failed:", txError);
      return NextResponse.json(
        { error: "Payroll transfer failed", payrollId: payroll._id },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Payroll run error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
