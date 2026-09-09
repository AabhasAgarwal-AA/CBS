import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

function generateUpiId(accountNumber: string, label: string) {
  // e.g., cbs.merchantname@cbabank
  const slug = label.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "qr" + Math.floor(Math.random() * 9999);
  return `${slug}.${accountNumber.slice(-4)}@cbabank`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountNumber = searchParams.get("accountNumber") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (accountNumber) where.accountNumber = accountNumber;
  const qrCodes = await db.qrCode.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      account: { include: { customer: { select: { fullName: true } } } },
      _count: { select: { payments: true } },
    },
  });
  return NextResponse.json({ qrCodes });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { accountNumber, merchantLabel, amount, purpose } = body as Record<string, unknown>;
  if (!accountNumber || !merchantLabel) {
    return NextResponse.json({ error: "accountNumber and merchantLabel required" }, { status: 400 });
  }
  const account = await db.account.findUnique({
    where: { accountNumber: String(accountNumber) },
    include: { customer: true },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (account.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account not active" }, { status: 400 });
  }

  // Generate a unique UPI ID
  let upiId = generateUpiId(account.accountNumber, String(merchantLabel));
  while (await db.qrCode.findUnique({ where: { upiId } })) {
    upiId = generateUpiId(account.accountNumber, String(merchantLabel) + Math.floor(Math.random() * 999));
  }

  const qr = await db.qrCode.create({
    data: {
      merchantLabel: String(merchantLabel),
      accountNumber: account.accountNumber,
      upiId,
      amount: amount ? Number(amount) : null,
      purpose: (purpose as string) || null,
      status: "ACTIVE",
    },
  });
  // Construct a UPI deep-link string (this is what gets encoded in the QR image)
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(String(merchantLabel))}${
    qr.amount ? `&am=${qr.amount}` : ""
  }&cu=INR&tn=${encodeURIComponent((purpose as string) || "CBS Payment")}`;

  await recordAudit({
    userId: user.id,
    action: "QR_GENERATE",
    entity: "QR",
    entityId: qr.id,
    details: `Generated QR for ${merchantLabel} (${upiId})${qr.amount ? ` amount ₹${qr.amount}` : ""}`,
  });
  return NextResponse.json({ qr, upiLink }, { status: 201 });
}
