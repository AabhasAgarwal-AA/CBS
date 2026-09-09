import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const matched = searchParams.get("matched");
  const where: Record<string, unknown> = {};
  if (matched === "true") where.matched = true;
  if (matched === "false") where.matched = false;
  const collections = await db.eCollection.findMany({
    where,
    take: limit,
    orderBy: { receivedAt: "desc" },
    include: { virtualAccount: { select: { virtualAccNo: true, upiId: true } } },
  });
  const total = collections.reduce((s, c) => s + c.amount, 0);
  return NextResponse.json({ collections, total, count: collections.length });
}

// POST — simulate an inward payment received via a virtual account (E-Collection)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { virtualAccountId, payerName, payerUpiId, amount } = body as Record<string, unknown>;
  if (!virtualAccountId || !payerName || !amount) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const va = await db.virtualAccount.findUnique({ where: { id: String(virtualAccountId) } });
  if (!va) return NextResponse.json({ error: "Virtual account not found" }, { status: 404 });
  const ref = `EC${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const collection = await db.eCollection.create({
    data: {
      virtualAccountId: va.id,
      payerName: String(payerName),
      payerUpiId: (payerUpiId as string) || null,
      amount: Number(amount),
      refNo: ref,
      status: "RECEIVED",
    },
  });
  return NextResponse.json({ collection }, { status: 201 });
}
