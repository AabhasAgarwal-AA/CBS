import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

// Gold rate per 10g (22K) — in production, fetch from live market API
const GOLD_RATE_PER_10G = 65000; // ₹65,000 per 10g of 22K gold (demo)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const loans = await db.goldLoan.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { fullName: true, customerNo: true, phone: true } } },
  });
  return NextResponse.json({
    loans,
    goldRate: GOLD_RATE_PER_10G,
    totalOutstanding: loans.reduce((s, l) => s + l.outstanding, 0),
    totalSanctioned: loans.reduce((s, l) => s + l.sanctionedAmount, 0),
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    customerId, accountNumber, ornamentType, grossWeight, netWeight, purity,
    interestRate, tenureMonths, appraiserName,
  } = body as Record<string, unknown>;
  if (!customerId || !ornamentType || !grossWeight || !netWeight || !purity) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const gw = Number(grossWeight);
  const nw = Number(netWeight);
  const pur = Number(purity); // e.g. 22 for 22K
  // Estimated value = (net weight / 10) × (purity/24) × gold rate
  const estimatedValue = (nw / 10) * (pur / 24) * GOLD_RATE_PER_10G;
  // Typically banks lend 75-90% of estimated value; here we use 80%
  const sanctionedAmount = Math.round(estimatedValue * 0.8);

  const count = await db.goldLoan.count();
  const loanNumber = `GL-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  const loan = await db.goldLoan.create({
    data: {
      loanNumber,
      customerId: String(customerId),
      accountNumber: (accountNumber as string) || null,
      ornamentType: String(ornamentType),
      grossWeight: gw,
      netWeight: nw,
      purity: pur,
      estimatedValue,
      sanctionedAmount,
      interestRate: Number(interestRate ?? 12),
      tenureMonths: Number(tenureMonths ?? 12),
      status: "PENDING",
      appraiserName: (appraiserName as string) || null,
    },
    include: { customer: { select: { fullName: true, customerNo: true } } },
  });
  await recordAudit({
    userId: user.id,
    action: "GOLD_LOAN_CREATE",
    entity: "GOLD_LOAN",
    entityId: loan.id,
    details: `Created gold loan ${loanNumber} for ${loan.customer.fullName}: ${ornamentType} ${nw}g ${pur}K, est. ₹${estimatedValue}, sanctioned ₹${sanctionedAmount}`,
  });
  return NextResponse.json({ loan }, { status: 201 });
}
