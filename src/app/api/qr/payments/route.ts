import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/qr/payments?direction=INWARD&limit=  — list QR payments
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (direction) where.direction = direction;
  const payments = await db.qrPayment.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { qr: { select: { merchantLabel: true, upiId: true } } },
  });
  return NextResponse.json({ payments });
}
