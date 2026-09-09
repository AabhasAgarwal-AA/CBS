import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sms?type=&limit=   — list SMS log
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  const logs = await db.smsLog.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { fullName: true, customerNo: true } } },
  });
  return NextResponse.json({ sms: logs });
}

// POST /api/sms  — send an ad-hoc SMS (demo: just logs to DB, no real carrier)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const { getSession } = await import("@/lib/session");
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { phone, message, type, customerId } = body as Record<string, unknown>;
  if (!phone || !message) {
    return NextResponse.json({ error: "phone and message required" }, { status: 400 });
  }
  const sms = await db.smsLog.create({
    data: {
      phone: String(phone),
      message: String(message).slice(0, 480),
      type: (type as string) || "MARKETING",
      customerId: (customerId as string) || null,
      status: "SENT",
    },
  });
  await import("@/lib/audit").then((m) =>
    m.recordAudit({
      userId: user.id,
      action: "SMS_SEND",
      entity: "SMS",
      entityId: sms.id,
      details: `SMS to ${phone}: ${String(message).slice(0, 80)}`,
    })
  );
  return NextResponse.json({ sms }, { status: 201 });
}
