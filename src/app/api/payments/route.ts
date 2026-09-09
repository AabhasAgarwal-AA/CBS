import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

function generateRef() {
  const d = new Date();
  const ymd =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `PO-${ymd}-${rand}`;
}

// GET /api/payments?status=&mode=&limit=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const mode = searchParams.get("mode") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (mode) where.mode = mode;
  const payments = await db.paymentOrder.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { fullName: true, customerNo: true, phone: true } } },
  });
  return NextResponse.json({ payments });
}

// POST — originate a new payment order (PENDING, needs approval)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    customerId,
    fromAccount,
    beneficiaryName,
    beneficiaryAccount,
    beneficiaryIfsc,
    amount,
    mode,
    remarks,
  } = body as Record<string, unknown>;

  if (!customerId || !fromAccount || !beneficiaryName || !beneficiaryAccount || !beneficiaryIfsc || !amount || !mode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const validModes = ["NEFT", "RTGS", "IMPS"];
  if (!validModes.includes(mode as string)) {
    return NextResponse.json({ error: "Invalid mode. Use NEFT, RTGS, or IMPS" }, { status: 400 });
  }
  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  // RTGS minimum ₹2 lakh
  if (mode === "RTGS" && amt < 200000) {
    return NextResponse.json({ error: "RTGS minimum amount is ₹2,00,000" }, { status: 400 });
  }
  // NEFT/IMPS maximum check
  if (mode !== "RTGS" && amt > 5000000) {
    return NextResponse.json({ error: "Amount exceeds NEFT/IMPS per-transaction cap of ₹50 lakh" }, { status: 400 });
  }
  // IFSC format: 4 letters + 0 + 6 alphanumeric
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(beneficiaryIfsc))) {
    return NextResponse.json({ error: "Invalid IFSC code format (e.g. HDFC0001234)" }, { status: 400 });
  }
  // Validate source account
  const account = await db.account.findUnique({ where: { accountNumber: String(fromAccount) } });
  if (!account) return NextResponse.json({ error: "Source account not found" }, { status: 404 });
  if (account.status !== "ACTIVE") return NextResponse.json({ error: "Source account not active" }, { status: 400 });
  if (account.customerId !== String(customerId)) {
    return NextResponse.json({ error: "Source account does not belong to customer" }, { status: 400 });
  }
  if (account.balance < amt) {
    return NextResponse.json({ error: "Insufficient balance in source account" }, { status: 400 });
  }

  const payment = await db.paymentOrder.create({
    data: {
      refNo: generateRef(),
      customerId: String(customerId),
      fromAccount: String(fromAccount),
      beneficiaryName: String(beneficiaryName),
      beneficiaryAccount: String(beneficiaryAccount),
      beneficiaryIfsc: String(beneficiaryIfsc),
      amount: amt,
      mode: mode as string,
      status: "PENDING",
      remarks: (remarks as string) || null,
    },
  });
  await recordAudit({
    userId: user.id,
    action: "PAYMENT_ORDER",
    entity: "PAYMENT",
    entityId: payment.id,
    details: `${mode} ₹${amt} to ${beneficiaryName} (${beneficiaryAccount}/${beneficiaryIfsc}) ref ${payment.refNo}`,
  });
  return NextResponse.json({ payment }, { status: 201 });
}
