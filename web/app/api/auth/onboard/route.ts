import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { connectDB } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { registerUnlinkUser } from "@/lib/unlink-worker";
import { deployTreasury } from "@/lib/treasury";
import { logAction } from "@/lib/audit";
import User from "@/lib/models/user";
import Organization from "@/lib/models/organization";
import Employee from "@/lib/models/employee";
import Invite from "@/lib/models/invite";
import { english, generateMnemonic } from "viem/accounts";
import mongoose from "mongoose";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

// Real USDC on Base Sepolia — used by Unlink's privacy pool
const DEFAULT_TOKEN = {
  address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
};

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
    const { type, inviteToken, name, orgName, orgType, tokens } = body;

    await connectDB();
    console.log("[Onboard] Connected to DB");

    // Check if user already exists
    const existing = await User.findOne({ privyId });
    if (existing) {
      console.log("[Onboard] User already onboarded:", privyId);
      return NextResponse.json({ error: "User already onboarded" }, { status: 400 });
    }

    // Get Privy user details
    console.log("[Onboard] Fetching Privy user details...");
    const privyUser = await privy.getUser(privyId);
    const email = privyUser.email?.address;
    let evmAddress = privyUser.wallet?.address;
    if (!evmAddress && privyUser.linkedAccounts) {
      const walletAccount = (privyUser.linkedAccounts as any[]).find(
        (a) => a.type === "wallet" && a.chainType === "ethereum"
      );
      if (walletAccount) evmAddress = walletAccount.address;
    }
    console.log("[Onboard] Privy user — email:", email, "wallet:", evmAddress || "none");

    // Generate mnemonic for Unlink
    console.log("[Onboard] Generating mnemonic...");
    const mnemonic = generateMnemonic(english);
    const encryptedMnemonic = encrypt(mnemonic);

    // Register with Unlink via worker
    console.log("[Onboard] Registering with Unlink...");
    let unlinkAddress: string | undefined;
    try {
      unlinkAddress = await registerUnlinkUser(mnemonic);
      console.log("[Onboard] ✓ Unlink address:", unlinkAddress);
    } catch (err) {
      console.warn("[Onboard] ⚠ Unlink registration failed:", (err as Error).message);
    }

    if (type === "admin") {
      if (!orgName) {
        return NextResponse.json({ error: "orgName is required" }, { status: 400 });
      }
      console.log("[Onboard] Creating admin org:", orgName, "type:", orgType || "TEAM");

      const orgTokens = tokens && tokens.length > 0 ? tokens : [DEFAULT_TOKEN];
      const orgId = new mongoose.Types.ObjectId();

      // Deploy treasury contract
      console.log("[Onboard] Deploying treasury contract...");
      const treasuryAdmins = evmAddress ? [evmAddress] : [];
      const { treasuryAddress, salt } = await deployTreasury(
        orgId.toString(),
        treasuryAdmins,
      );
      console.log("[Onboard] ✓ Treasury deployed at:", treasuryAddress);

      console.log("[Onboard] Creating admin user in DB...");
      const user = await User.create({
        privyId,
        email,
        name: name || email,
        role: "ADMIN",
        encryptedMnemonic,
        unlinkAddress,
        evmAddress,
      });
      console.log("[Onboard] ✓ Admin user created:", user._id);

      console.log("[Onboard] Creating organization in DB...");
      const org = await Organization.create({
        _id: orgId,
        name: orgName,
        orgType: orgType || "TEAM",
        tokens: orgTokens,
        treasuryAddress,
        treasurySalt: salt,
        admins: [user._id],
        createdBy: user._id,
      });
      console.log("[Onboard] ✓ Organization created:", org._id, org.name);

      user.organizationId = org._id;
      await user.save();

      await logAction({
        organizationId: org._id.toString(),
        userId: user._id.toString(),
        userName: user.name || user.email || "Admin",
        action: "Organization created",
        details: `Created "${orgName}" with treasury at ${treasuryAddress}, Unlink: ${unlinkAddress || "pending"}`,
      });

      console.log("[Onboard] ✅ Admin onboarding complete!");
      console.log("[Onboard]   Name:", user.name);
      console.log("[Onboard]   Wallet:", evmAddress || "none");
      console.log("[Onboard]   Unlink:", unlinkAddress || "none");
      console.log("[Onboard]   Treasury:", treasuryAddress);
      console.log("[Onboard]   Org:", orgName);

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
      console.log("[Onboard] Employee accepting invite:", inviteToken);
      const invite = await Invite.findOne({
        token: inviteToken,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!invite) {
        console.log("[Onboard] ✗ Invalid or expired invite");
        return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
      }
      console.log("[Onboard] ✓ Invite valid for org:", invite.organizationId);

      console.log("[Onboard] Creating employee user...");
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
        profileCompleted: !!evmAddress,
      });
      console.log("[Onboard] ✓ Employee user created:", user._id);

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

      console.log("[Onboard] ✅ Employee onboarding complete!");
      console.log("[Onboard]   Name:", user.name);
      console.log("[Onboard]   Wallet:", evmAddress || "none");
      console.log("[Onboard]   Unlink:", unlinkAddress || "none");
      console.log("[Onboard]   Salary:", invite.salary, invite.payFrequency);

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
