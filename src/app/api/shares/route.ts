import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  const shares = await db.share.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { fullName: true, customerNo: true } } },
  });
  const totalQuantity = shares.reduce((s, sh) => s + sh.quantity, 0);
  const totalValue = shares.reduce((s, sh) => s + sh.paidValue * sh.quantity, 0);
  return NextResponse.json({ shares, totalQuantity, totalValue });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { customerId, faceValue, quantity, certificateNo } = body as Record<string, unknown>;
  if (!customerId || !quantity) return NextResponse.json({ error: "customerId and quantity required" }, { status: 400 });
  const fv = Number(faceValue ?? 10);
  const qty = Number(quantity);
  const count = await db.share.count();
  const shareNo = `SHR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const share = await db.share.create({
    data: {
      shareNo,
      customerId: String(customerId),
      faceValue: fv,
      quantity: qty,
      paidValue: fv,
      certificateNo: (certificateNo as string) || null,
      status: "ACTIVE",
    },
  });
  await recordAudit({
    userId: user.id,
    action: "SHARE_ISSUE",
    entity: "SHARE",
    entityId: share.id,
    details: `Issued ${qty} shares (${shareNo}) @ ₹${fv} to customer ${customerId}`,
  });
  return NextResponse.json({ share }, { status: 201 });
}
