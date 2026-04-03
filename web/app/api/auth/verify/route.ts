import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";

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

    // Get Privy user details for email/wallet
    const privyUser = await privy.getUser(privyId);

    await connectDB();
    const user = await User.findOne({ privyId }).populate("organizationId");

    if (!user) {
      // User exists in Privy but not in our DB — needs onboarding
      return NextResponse.json({
        authenticated: true,
        onboarded: false,
        privyId,
        email: privyUser.email?.address,
        walletAddress: privyUser.wallet?.address,
      });
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
        evmAddress: user.evmAddress,
        ensName: user.ensName,
        organization: user.organizationId,
      },
    });
  } catch (error) {
    console.error("Auth verify error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
