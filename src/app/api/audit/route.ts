import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const entity = searchParams.get("entity") ?? "";
  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  const logs = await db.auditLog.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });
  return NextResponse.json({ logs });
}
