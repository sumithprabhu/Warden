import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { connectDB } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";
import User from "@/lib/models/user";
import Organization from "@/lib/models/organization";
import Employee from "@/lib/models/employee";
import Invite from "@/lib/models/invite";
import { english, generateMnemonic } from "viem/accounts";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const verifiedClaims = await privy.verifyAuthToken(token);
    const privyId = verifiedClaims.userId;

    const body = await req.json();
    const { type, inviteToken, name, orgName, orgType, tokenAddress, tokenSymbol, tokenDecimals } = body;

    await connectDB();

    // Check if user already exists
    const existing = await User.findOne({ privyId });
    if (existing) {
      return NextResponse.json({ error: "User already onboarded" }, { status: 400 });
    }

    // Get Privy user details
    const privyUser = await privy.getUser(privyId);
    const email = privyUser.email?.address;
    const evmAddress = privyUser.wallet?.address;

    // Generate Unlink mnemonic and get address
    const mnemonic = generateMnemonic(english);
    const encryptedMnemonic = encrypt(mnemonic);

    // Get Unlink address
    const unlinkClient = createUnlinkClient(mnemonic);
    const unlinkAddress = await unlinkClient.getAddress();

    if (type === "admin") {
      // Create org + admin user
      if (!orgName || !tokenAddress) {
        return NextResponse.json({ error: "orgName and tokenAddress are required" }, { status: 400 });
      }

      const evmPrivateKey = encrypt(process.env.EVM_PRIVATE_KEY || "");

      const org = await Organization.create({
        name: orgName,
        orgType: orgType || "TEAM",
        tokenAddress,
        tokenSymbol: tokenSymbol || "USDC",
        tokenDecimals: tokenDecimals || 18,
        encryptedEvmPrivateKey: evmPrivateKey,
      });

      const user = await User.create({
        privyId,
        email,
        name: name || email,
        role: "ADMIN",
        encryptedMnemonic,
        unlinkAddress,
        evmAddress,
        organizationId: org._id,
      });

      // Set createdBy on org
      org.createdBy = user._id;
      await org.save();

      return NextResponse.json({
        user: {
          id: user._id,
          role: user.role,
          name: user.name,
          unlinkAddress: user.unlinkAddress,
          organization: org,
        },
      });
    }

    if (type === "employee" && inviteToken) {
      // Accept invite
      const invite = await Invite.findOne({
        token: inviteToken,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!invite) {
        return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
      }

      const user = await User.create({
        privyId,
        email: email || invite.email,
        name: name || email,
        role: "EMPLOYEE",
        ensName: invite.ensName,
        encryptedMnemonic,
        unlinkAddress,
        evmAddress,
        organizationId: invite.organizationId,
      });

      await Employee.create({
        userId: user._id,
        organizationId: invite.organizationId,
        departmentId: invite.departmentId,
        employeeType: invite.employeeType,
        salary: invite.salary,
        payFrequency: invite.payFrequency,
      });

      invite.used = true;
      await invite.save();

      return NextResponse.json({
        user: {
          id: user._id,
          role: user.role,
          name: user.name,
          unlinkAddress: user.unlinkAddress,
        },
      });
    }

    return NextResponse.json({ error: "Invalid onboard type" }, { status: 400 });
  } catch (error) {
    console.error("Onboard error:", error);
    return NextResponse.json({ error: "Onboarding failed" }, { status: 500 });
  }
}
