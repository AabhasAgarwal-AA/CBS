import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const charges = await db.smsCharge.findMany({
    take: limit,
    orderBy: { chargeDate: "desc" },
  });
  const total = charges.reduce((s, c) => s + c.amount, 0);
  return NextResponse.json({ charges, total, count: charges.length });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { accountNumber, smsCount, amount, customerId } = body as Record<string, unknown>;
  if (!accountNumber || !amount) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const charge = await db.smsCharge.create({
    data: {
      accountNumber: String(accountNumber),
      smsCount: Number(smsCount ?? 1),
      amount: Number(amount),
      customerId: (customerId as string) || null,
    },
  });
  await recordAudit({
    userId: user.id,
    action: "SMS_CHARGE",
    entity: "SMS_CHARGE",
    entityId: charge.id,
    details: `Deducted SMS charge ₹${amount} from ${accountNumber} for ${smsCount} SMS`,
  });
  return NextResponse.json({ charge }, { status: 201 });
}
