import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/employee";

// PUT /api/employees/[id] — update employee
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const { salary, payFrequency, employeeType, departmentId, isActive } = body;

    await connectDB();

    const employee = await Employee.findOne({
      _id: id,
      organizationId: admin.organizationId,
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (salary !== undefined) employee.salary = salary;
    if (payFrequency !== undefined) employee.payFrequency = payFrequency;
    if (employeeType !== undefined) employee.employeeType = employeeType;
    if (departmentId !== undefined) employee.departmentId = departmentId;
    if (isActive !== undefined) employee.isActive = isActive;

    await employee.save();

    return NextResponse.json({ employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/employees/[id] — deactivate employee
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    await connectDB();

    const employee = await Employee.findOneAndUpdate(
      { _id: id, organizationId: admin.organizationId },
      { isActive: false },
      { new: true },
    );

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Employee deactivated", employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
