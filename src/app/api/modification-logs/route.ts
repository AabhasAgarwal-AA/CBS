import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  const logs = await db.modificationLog.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ logs });
}
