import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Organization from "@/lib/models/organization";

// GET /api/org — get current user's organization
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    await connectDB();
    const org = await Organization.findById(user.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: org._id,
      name: org.name,
      logo: org.logo,
      orgType: org.orgType,
      tokenAddress: org.tokenAddress,
      tokenSymbol: org.tokenSymbol,
      tokenDecimals: org.tokenDecimals,
      approvers: org.approvers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PUT /api/org — update organization settings
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const { name, logo, orgType, tokenAddress, tokenSymbol, tokenDecimals, approvers } = body;

    await connectDB();
    const org = await Organization.findByIdAndUpdate(
      user.organizationId,
      {
        ...(name && { name }),
        ...(logo !== undefined && { logo }),
        ...(orgType && { orgType }),
        ...(tokenAddress && { tokenAddress }),
        ...(tokenSymbol && { tokenSymbol }),
        ...(tokenDecimals && { tokenDecimals }),
        ...(approvers && { approvers }),
      },
      { new: true },
    );

    return NextResponse.json({
      id: org._id,
      name: org.name,
      logo: org.logo,
      orgType: org.orgType,
      tokenAddress: org.tokenAddress,
      tokenSymbol: org.tokenSymbol,
      tokenDecimals: org.tokenDecimals,
      approvers: org.approvers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
