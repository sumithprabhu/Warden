import { PrivyClient } from "@privy-io/server-auth";
import { NextRequest } from "next/server";
import { connectDB } from "./db";
import User from "./models/user";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const verifiedClaims = await privy.verifyAuthToken(token);
    await connectDB();
    const user = await User.findOne({ privyId: verifiedClaims.userId });
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireAuth(req);
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}
