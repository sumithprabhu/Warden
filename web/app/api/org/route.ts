import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { logAction } from "@/lib/audit";
import Organization from "@/lib/models/organization";
import "@/lib/models/user";

// GET /api/org — get current user's organization
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    await connectDB();
    const org = await Organization.findById(user.organizationId).populate("admins", "name email evmAddress");
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: org._id,
      name: org.name,
      logo: org.logo,
      orgType: org.orgType,
      tokens: org.tokens,
      treasuryAddress: org.treasuryAddress,
      approvers: org.approvers,
      admins: org.admins,
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
    const { name, logo, orgType, approvers, addToken, removeTokenAddress, addAdminUserId } = body;

    await connectDB();
    const org = await Organization.findById(user.organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (name) org.name = name;
    if (logo !== undefined) org.logo = logo;
    if (orgType) org.orgType = orgType;
    if (approvers) org.approvers = approvers;

    // Add a new token
    if (addToken && addToken.address) {
      const exists = org.tokens.some(
        (t: any) => t.address.toLowerCase() === addToken.address.toLowerCase()
      );
      if (!exists) {
        org.tokens.push(addToken);
        await logAction({
          organizationId: org._id.toString(),
          userId: user._id.toString(),
          userName: user.name || user.email || "Admin",
          action: "Token added",
          details: `Added ${addToken.symbol} (${addToken.address})`,
        });
      }
    }

    // Remove a token
    if (removeTokenAddress) {
      org.tokens = org.tokens.filter(
        (t: any) => t.address.toLowerCase() !== removeTokenAddress.toLowerCase()
      );
      await logAction({
        organizationId: org._id.toString(),
        userId: user._id.toString(),
        userName: user.name || user.email || "Admin",
        action: "Token removed",
        details: `Removed token ${removeTokenAddress}`,
      });
    }

    // Add another admin
    if (addAdminUserId) {
      if (!org.admins.includes(addAdminUserId)) {
        org.admins.push(addAdminUserId);
        await logAction({
          organizationId: org._id.toString(),
          userId: user._id.toString(),
          userName: user.name || user.email || "Admin",
          action: "Admin added",
          details: `Added admin user ${addAdminUserId}`,
        });
      }
    }

    await org.save();

    return NextResponse.json({
      id: org._id,
      name: org.name,
      logo: org.logo,
      orgType: org.orgType,
      tokens: org.tokens,
      treasuryAddress: org.treasuryAddress,
      approvers: org.approvers,
      admins: org.admins,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
