import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { createUnlinkClient } from "@/lib/unlink";

// GET /api/treasury/transactions — Unlink transaction history
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const mnemonic = decrypt(admin.encryptedMnemonic);
    const unlink = createUnlinkClient(mnemonic);

    const url = new URL(req.url);
    const type = url.searchParams.get("type") as "deposit" | "transfer" | "withdraw" | undefined;
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const cursor = url.searchParams.get("cursor") || undefined;

    const transactions = await unlink.getTransactions({
      ...(type && { type }),
      limit,
      ...(cursor && { cursor }),
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
