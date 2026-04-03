import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/employee";

// GET /api/payroll/upcoming — preview next payroll
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    await connectDB();

    const url = new URL(req.url);
    const departmentId = url.searchParams.get("departmentId");

    const filter: Record<string, unknown> = {
      organizationId: admin.organizationId,
      isActive: true,
    };
    if (departmentId) filter.departmentId = departmentId;

    const employees = await Employee.find(filter)
      .populate("userId", "name email ensName unlinkAddress")
      .populate("departmentId", "name");

    const totalAmount = employees
      .reduce((sum, emp) => sum + BigInt(emp.salary), BigInt(0))
      .toString();

    const breakdown = employees.map((emp) => {
      const user = emp.userId as unknown as {
        name: string;
        email: string;
        ensName: string;
      };
      return {
        employeeId: emp._id,
        name: user.name,
        email: user.email,
        ensName: user.ensName,
        department: emp.departmentId,
        salary: emp.salary,
        payFrequency: emp.payFrequency,
        employeeType: emp.employeeType,
      };
    });

    return NextResponse.json({
      totalAmount,
      employeeCount: employees.length,
      breakdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
