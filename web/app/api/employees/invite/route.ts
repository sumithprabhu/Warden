import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveENS, isENSName } from "@/lib/ens";
import Invite from "@/lib/models/invite";
import Organization from "@/lib/models/organization";
import { Resend } from "resend";

// GET /api/employees/invite — list all invites for this org
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    await connectDB();

    const invites = await Invite.find({ organizationId: admin.organizationId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ invites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

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

    // Send invite email if email provided and Resend is configured
    if (email && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "your-resend-key") {
      try {
        const org = await Organization.findById(admin.organizationId);
        const orgName = org?.name || "your organization";
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Warden <onboarding@resend.dev>",
          to: email,
          subject: `You're invited to join ${orgName} on Warden`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Warden</h2>
              <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Private payroll on Base</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="font-size: 15px; line-height: 1.6; color: #333;">
                You've been invited to join <strong>${orgName}</strong> on Warden, a private payroll platform powered by zero-knowledge proofs.
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #333;">
                Click the link below to accept your invite and set up your account:
              </p>
              <a href="${inviteUrl}" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; margin: 16px 0;">
                Accept Invite
              </a>
              <p style="font-size: 13px; color: #999; margin-top: 24px;">
                Or copy this link: ${inviteUrl}
              </p>
              <p style="font-size: 13px; color: #999; margin-top: 8px;">
                This invite expires in 7 days.
              </p>
            </div>
          `,
        });
        console.log(`[Invite] Email sent to ${email}`);
      } catch (emailErr) {
        console.error("[Invite] Failed to send email:", emailErr);
      }
    }

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

// DELETE /api/employees/invite — revoke an invite
export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
    }

    await connectDB();

    const invite = await Invite.findOne({
      _id: inviteId,
      organizationId: admin.organizationId,
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.used) {
      return NextResponse.json({ error: "Invite already accepted, cannot revoke" }, { status: 400 });
    }

    await Invite.deleteOne({ _id: inviteId });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
