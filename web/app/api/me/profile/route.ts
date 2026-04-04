import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";

// GET /api/me/profile
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      evmAddress: user.evmAddress,
      ensName: user.ensName,
      dateOfBirth: user.dateOfBirth,
      phone: user.phone,
      profileCompleted: user.profileCompleted,
      role: user.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

// PUT /api/me/profile — update profile
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { name, evmAddress, ensName, dateOfBirth, phone } = body;

    await connectDB();

    // Wallet address is required to mark profile as complete
    const walletAddress = evmAddress?.trim() || user.evmAddress;

    const update: Record<string, any> = {};
    if (name !== undefined) update.name = name.trim();
    if (evmAddress !== undefined) update.evmAddress = evmAddress.trim();
    if (ensName !== undefined) update.ensName = ensName.trim();
    if (dateOfBirth !== undefined) update.dateOfBirth = dateOfBirth;
    if (phone !== undefined) update.phone = phone.trim();

    // Mark profile as completed if wallet address exists
    if (walletAddress) {
      update.profileCompleted = true;
    }

    const updated = await User.findByIdAndUpdate(user._id, update, { new: true });

    return NextResponse.json({
      id: updated._id,
      name: updated.name,
      email: updated.email,
      evmAddress: updated.evmAddress,
      ensName: updated.ensName,
      dateOfBirth: updated.dateOfBirth,
      phone: updated.phone,
      profileCompleted: updated.profileCompleted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}
