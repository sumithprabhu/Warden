import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import Organization from "@/lib/models/organization";
import Payroll from "@/lib/models/payroll";
import Payment from "@/lib/models/payment";
import Employee from "@/lib/models/employee";
import User from "@/lib/models/user";

// POST /api/payroll/[id]/approve — DAO approver signs off
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req);
    const { id } = await params;

    await connectDB();

    const payroll = await Payroll.findById(id);
    if (!payroll || payroll.status !== "PENDING_APPROVAL") {
      return NextResponse.json({ error: "Payroll not found or not pending approval" }, { status: 404 });
    }

    const org = await Organization.findById(payroll.organizationId);
    if (!org || org.orgType !== "DAO") {
      return NextResponse.json({ error: "Not a DAO organization" }, { status: 400 });
    }

    // Check if user is an approver
    const isApprover = org.approvers.some(
      (a: { evmAddress: string }) => a.evmAddress.toLowerCase() === user.evmAddress?.toLowerCase(),
    );

    if (!isApprover) {
      return NextResponse.json({ error: "Not an authorized approver" }, { status: 403 });
    }

    // Check if already approved by this user
    const alreadyApproved = payroll.approvals.some(
      (a: { approverAddress: string }) => a.approverAddress.toLowerCase() === user.evmAddress?.toLowerCase(),
    );

    if (alreadyApproved) {
      return NextResponse.json({ error: "Already approved" }, { status: 400 });
    }

    // Add approval
    payroll.approvals.push({
      approverAddress: user.evmAddress!,
      signedAt: new Date(),
    });
    await payroll.save();

    // Check if we have enough approvals (simple majority)
    const threshold = Math.ceil(org.approvers.length / 2);
    if (payroll.approvals.length >= threshold) {
      // Execute payroll
      const admin = await User.findOne({
        organizationId: org._id,
        role: "ADMIN",
      });

      if (!admin) {
        return NextResponse.json({ error: "Admin not found" }, { status: 500 });
      }

      const mnemonic = decrypt(admin.encryptedMnemonic);
      const unlink = createUnlinkClient(mnemonic);

      const employees = await Employee.find({
        organizationId: org._id,
        isActive: true,
        ...(payroll.departmentId && { departmentId: payroll.departmentId }),
      }).populate("userId");

      const transfers = employees.map((emp) => {
        const empUser = emp.userId as unknown as { unlinkAddress: string };
        return {
          recipientAddress: empUser.unlinkAddress,
          amount: emp.salary,
        };
      });

      try {
        const result = await unlink.transfer({
          token: org.tokenAddress,
          transfers,
        });

        payroll.unlinkTxId = result.txId;
        payroll.status = "PROCESSING";
        await payroll.save();

        await unlink.pollTransactionStatus(result.txId);

        payroll.status = "COMPLETED";
        payroll.executedAt = new Date();
        await payroll.save();

        await Payment.updateMany(
          { payrollId: payroll._id },
          { status: "COMPLETED", unlinkTxId: result.txId },
        );

        return NextResponse.json({
          approved: true,
          executed: true,
          payrollId: payroll._id,
          status: "COMPLETED",
        });
      } catch {
        payroll.status = "FAILED";
        await payroll.save();
        return NextResponse.json({ error: "Transfer execution failed" }, { status: 500 });
      }
    }

    return NextResponse.json({
      approved: true,
      executed: false,
      approvalCount: payroll.approvals.length,
      threshold,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
