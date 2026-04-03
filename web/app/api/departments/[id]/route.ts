import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Department from "@/lib/models/department";

// DELETE /api/departments/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    await connectDB();

    const deleted = await Department.findOneAndDelete({
      _id: id,
      organizationId: admin.organizationId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Department deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
