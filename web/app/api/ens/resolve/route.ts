import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resolveENS, isENSName } from "@/lib/ens";

// GET /api/ens/resolve?name=yashu.eth
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const url = new URL(req.url);
    const name = url.searchParams.get("name");

    if (!name || !isENSName(name)) {
      return NextResponse.json({ error: "Valid ENS name is required" }, { status: 400 });
    }

    const address = await resolveENS(name);

    if (!address) {
      return NextResponse.json({ error: "Could not resolve ENS name" }, { status: 404 });
    }

    return NextResponse.json({ name, address });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
