import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { logAction } from "@/lib/audit";
import { unlinkTransfer, UNLINK_USDC } from "@/lib/unlink-worker";
import Organization from "@/lib/models/organization";
import Employee from "@/lib/models/employee";
import User from "@/lib/models/user";
import Payroll from "@/lib/models/payroll";
import Payment from "@/lib/models/payment";

// POST /api/payroll/run — execute private payroll via Unlink ZK transfers
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { departmentId } = body;

    await connectDB();
    console.log("[Payroll] ▶ Starting payroll run...");

    const org = await Organization.findById(admin.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    console.log("[Payroll] Org:", org.name);

    // Get active employees
    const filter: Record<string, unknown> = {
      organizationId: admin.organizationId,
      isActive: true,
    };
    if (departmentId) filter.departmentId = departmentId;

    const employees = await Employee.find(filter).populate("userId");
    console.log("[Payroll] Active employees found:", employees.length);

    if (employees.length === 0) {
      console.log("[Payroll] ✗ No active employees");
      return NextResponse.json({ error: "No active employees found" }, { status: 400 });
    }

    // Validate all employees have Unlink addresses
    const invalidEmployees = employees.filter(
      (emp) => !(emp.userId as any)?.unlinkAddress
    );
    if (invalidEmployees.length > 0) {
      const names = invalidEmployees.map(
        (e) => (e.userId as any)?.name || (e.userId as any)?.email || "Unknown"
      );
      console.log("[Payroll] ✗ Employees missing Unlink address:", names);
      return NextResponse.json({
        error: `These employees don't have Unlink addresses: ${names.join(", ")}. They need to re-login to generate one.`,
      }, { status: 400 });
    }

    const totalAmount = employees
      .reduce((sum, emp) => sum + parseFloat(emp.salary), 0)
      .toString();
    console.log("[Payroll] Total amount: $" + totalAmount);
    employees.forEach((emp) => {
      const u = emp.userId as any;
      console.log(`[Payroll]   → ${u.name || u.email}: $${emp.salary} → ${u.unlinkAddress?.slice(0, 20)}...`);
    });

    // Create payroll record
    const payroll = await Payroll.create({
      organizationId: admin.organizationId,
      departmentId: departmentId || undefined,
      status: org.orgType === "DAO" ? "PENDING_APPROVAL" : "PROCESSING",
      totalAmount,
      employeeCount: employees.length,
    });

    // Create individual payment records
    await Payment.insertMany(
      employees.map((emp) => ({
        payrollId: payroll._id,
        employeeUserId: (emp.userId as any)._id,
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
        },
      });
    }

    // Build transfers list for Unlink multi-recipient transfer
    const transfers = employees.map((emp) => {
      const user = emp.userId as any;
      // Convert salary to USDC units (6 decimals)
      const amountInUnits = (parseFloat(emp.salary) * 1e6).toFixed(0);
      return {
        recipientAddress: user.unlinkAddress as string,
        amount: amountInUnits,
      };
    });

    // Get admin's mnemonic to sign the transfer
    const adminMnemonic = decrypt(admin.encryptedMnemonic);

    console.log(`[Payroll] Executing private transfer for ${employees.length} employees, total: ${totalAmount} USDC`);
    console.log(`[Payroll] Transfers:`, transfers.map(t => ({ to: t.recipientAddress.slice(0, 20) + "...", amount: t.amount })));

    try {
      // Execute private ZK transfer via Unlink
      const result = await unlinkTransfer({
        mnemonic: adminMnemonic,
        token: UNLINK_USDC,
        transfers,
      });

      console.log(`[Payroll] Transfer submitted:`, result);

      payroll.unlinkTxId = result.txId;
      payroll.status = "PROCESSING";
      await payroll.save();

      // Update all payments
      await Payment.updateMany(
        { payrollId: payroll._id },
        { status: "PROCESSING", unlinkTxId: result.txId },
      );

      await logAction({
        organizationId: org._id.toString(),
        userId: admin._id.toString(),
        userName: admin.name || admin.email || "Admin",
        action: "Payroll executed",
        details: `Private ZK transfer for ${employees.length} employees, total $${totalAmount}. Unlink TX: ${result.txId}`,
      });

      return NextResponse.json({
        payroll: {
          id: payroll._id,
          status: "PROCESSING",
          totalAmount,
          employeeCount: employees.length,
          unlinkTxId: result.txId,
          message: "Private payroll transfer submitted. ZK proof is being generated — this takes ~2 minutes.",
        },
      });
    } catch (txError: any) {
      payroll.status = "FAILED";
      await payroll.save();
      await Payment.updateMany(
        { payrollId: payroll._id },
        { status: "FAILED" },
      );

      console.error("[Payroll] Transfer failed:", txError.message);
      return NextResponse.json(
        { error: `Private transfer failed: ${txError.message}`, payrollId: payroll._id },
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
