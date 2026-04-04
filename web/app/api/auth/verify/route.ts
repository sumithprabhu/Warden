import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";
import "@/lib/models/organization";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

function getWalletAddress(privyUser: any): string | undefined {
  // 1. Direct wallet field (most recent linked wallet)
  if (privyUser.wallet?.address) return privyUser.wallet.address;

  // 2. Search linkedAccounts for embedded wallet (walletClientType === 'privy')
  if (privyUser.linkedAccounts) {
    const embedded = privyUser.linkedAccounts.find(
      (a: any) => a.type === "wallet" && a.walletClientType === "privy"
    );
    if (embedded?.address) return embedded.address;

    // 3. Any wallet at all
    const anyWallet = privyUser.linkedAccounts.find(
      (a: any) => a.type === "wallet"
    );
    if (anyWallet?.address) return anyWallet.address;
  }

  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const verifiedClaims = await privy.verifyAuthToken(token);
    const privyId = verifiedClaims.userId;

    const privyUser = await privy.getUser(privyId);
    const walletAddress = getWalletAddress(privyUser);

    console.log("[Verify] User:", privyId, "wallet:", walletAddress || "none");

    await connectDB();
    const user = await User.findOne({ privyId }).populate("organizationId");

    if (!user) {
      return NextResponse.json({
        authenticated: true,
        onboarded: false,
        privyId,
        email: privyUser.email?.address,
        walletAddress,
      });
    }

    // Update evmAddress if missing but Privy has one
    if (!user.evmAddress && walletAddress) {
      user.evmAddress = walletAddress;
      await user.save();
    }

    return NextResponse.json({
      authenticated: true,
      onboarded: true,
      user: {
        id: user._id,
        privyId: user.privyId,
        email: user.email,
        name: user.name,
        role: user.role,
        unlinkAddress: user.unlinkAddress,
        evmAddress: user.evmAddress || walletAddress,
        ensName: user.ensName,
        profileCompleted: user.profileCompleted ?? false,
        organization: user.organizationId,
      },
    });
  } catch (error) {
    console.error("Auth verify error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
