import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Department from "@/lib/models/department";

// GET /api/departments
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    await connectDB();

    const departments = await Department.find({
      organizationId: admin.organizationId,
    }).sort({ name: 1 });

    return NextResponse.json({ departments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/departments
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    await connectDB();

    const department = await Department.create({
      name,
      organizationId: admin.organizationId,
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
