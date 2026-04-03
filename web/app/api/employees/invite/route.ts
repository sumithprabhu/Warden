import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveENS, isENSName } from "@/lib/ens";
import Invite from "@/lib/models/invite";

// POST /api/employees/invite — create invite link
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { email, ensName, salary, payFrequency, employeeType, departmentId } = body;

    if (!salary) {
      return NextResponse.json({ error: "salary is required" }, { status: 400 });
    }

    if (!email && !ensName) {
      return NextResponse.json({ error: "email or ensName is required" }, { status: 400 });
    }

    // Resolve ENS if provided
    let resolvedEns: string | undefined;
    if (ensName && isENSName(ensName)) {
      const resolved = await resolveENS(ensName);
      if (!resolved) {
        return NextResponse.json({ error: `Could not resolve ENS name: ${ensName}` }, { status: 400 });
      }
      resolvedEns = ensName;
    }

    await connectDB();

    const invite = await Invite.create({
      organizationId: admin.organizationId,
      email,
      ensName: resolvedEns,
      salary,
      payFrequency: payFrequency || "MONTHLY",
      employeeType: employeeType || "FULL_TIME",
      departmentId: departmentId || undefined,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${invite.token}`;

    return NextResponse.json({
      invite: {
        id: invite._id,
        token: invite.token,
        email: invite.email,
        ensName: invite.ensName,
        inviteUrl,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
