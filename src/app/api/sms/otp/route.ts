import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/sms/otp — generate OTP for a customer (for SMS banking / mobile app login)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, customerId } = body as Record<string, unknown>;
  if (!phone && !customerId) {
    return NextResponse.json({ error: "phone or customerId required" }, { status: 400 });
  }
  const where = customerId ? { id: String(customerId) } : { phone: String(phone) };
  const customer = await db.customer.findFirst({ where });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await import("crypto").then((c) =>
    Array.from(new Uint8Array(c.subtle ? 0 : 0)).join("") // placeholder
  );
  // Simple hash for demo (NOT secure - production should use bcrypt/argon2)
  const { createHash } = await import("crypto");
  const hash = createHash("sha256").update(otp + "::otp-salt").digest("hex");

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await db.smsLog.create({
    data: {
      customerId: customer.id,
      phone: customer.phone,
      message: `Your CBS verification OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      type: "OTP",
      status: "SENT",
      otpHash: hash,
      expiresAt,
    },
  });
  // In production, dispatch via an actual SMS gateway (e.g., Twilio, MSG91, Kaleyra).
  // For this demo, we return the OTP in the response so the staff can read it aloud.
  return NextResponse.json({
    ok: true,
    otp, // demo: returned for staff visibility; remove in production
    customerId: customer.id,
    phone: customer.phone,
    expiresAt,
  });
}

// POST /api/sms/otp/verify  — verify OTP
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { customerId, otp } = body as Record<string, unknown>;
  if (!customerId || !otp) {
    return NextResponse.json({ error: "customerId and otp required" }, { status: 400 });
  }
  const { createHash } = await import("crypto");
  const hash = createHash("sha256").update(String(otp) + "::otp-salt").digest("hex");
  const record = await db.smsLog.findFirst({
    where: { customerId: String(customerId), type: "OTP", otpHash: hash },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
  if (record.expiresAt && record.expiresAt < new Date()) {
    return NextResponse.json({ error: "OTP expired" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, customerId });
}
