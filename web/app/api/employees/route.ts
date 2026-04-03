import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/employee";
import User from "@/lib/models/user";

// GET /api/employees — list all employees in org
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    await connectDB();

    const employees = await Employee.find({
      organizationId: admin.organizationId,
    })
      .populate("userId", "name email ensName unlinkAddress evmAddress")
      .populate("departmentId", "name")
      .sort({ createdAt: -1 });

    const result = employees.map((emp) => {
      const user = emp.userId as unknown as {
        _id: string;
        name: string;
        email: string;
        ensName: string;
        unlinkAddress: string;
        evmAddress: string;
      };
      return {
        id: emp._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        ensName: user.ensName,
        unlinkAddress: user.unlinkAddress,
        evmAddress: user.evmAddress,
        department: emp.departmentId,
        employeeType: emp.employeeType,
        salary: emp.salary,
        payFrequency: emp.payFrequency,
        isActive: emp.isActive,
        createdAt: emp.createdAt,
      };
    });

    return NextResponse.json({ employees: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
