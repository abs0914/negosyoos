import { NextResponse } from "next/server";
import { AppError } from "@negosyo-os/core/errors";
import { getWorldSnapshot } from "@/features/business-world/server";
export async function GET(request: Request, context: { params: Promise<{ businessId: string }> }) {
  try {
    const { businessId } = await context.params;
    const snapshot = await getWorldSnapshot(businessId, new URL(request.url).searchParams.get("branch"));
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 503;
    return NextResponse.json({ error: status === 503 ? "World is temporarily unavailable." : "Access to this world is unavailable." }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
