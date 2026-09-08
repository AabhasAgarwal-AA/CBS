import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { calculateEMI, generateLoanNo, toNumber } from "@/lib/banking";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const loans = await db.loan.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      account: {
        select: {
          accountNumber: true,
          balance: true,
          type: true,
          status: true,
        },
      },
    },
  });
  // Convert Decimal fields for JSON serialization
  const out = loans.map((l) => ({
    ...l,
    principal: toNumber(l.principal),
    interestRate: toNumber(l.interestRate),
    emi: toNumber(l.emi),
    outstanding: toNumber(l.outstanding),
    account: l.account
      ? {
          ...l.account,
          balance: toNumber(l.account.balance),
        }
      : null,
  }));
  return NextResponse.json({ loans: out });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { customerId, type, principal, interestRate, tenureMonths, accountNumber } =
    body as Record<string, unknown>;

  if (!customerId || !type || !principal || !interestRate || !tenureMonths) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const P = Number(principal);
  const R = Number(interestRate);
  const T = Number(tenureMonths);
  if (P <= 0 || T <= 0) return NextResponse.json({ error: "Invalid principal/tenure" }, { status: 400 });

  const customer = await db.customer.findUnique({ where: { id: String(customerId) } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const count = await db.loan.count();
  const loanNumber = generateLoanNo(count + 1);
  const emi = calculateEMI(P, R, T);

  const loan = await db.loan.create({
    data: {
      loanNumber,
      customerId: String(customerId),
      accountNumber: (accountNumber as string) || null,
      type: type as string,
      principal: P,
      interestRate: R,
      tenureMonths: T,
      emi,
      outstanding: 0,
      status: "PENDING",
    },
  });

  await recordAudit({
    userId: user.id,
    action: "LOAN_APPLY",
    entity: "LOAN",
    entityId: loan.id,
    details: `Loan application ${loanNumber} for ${customer.fullName}: ${type} principal ${P} @ ${R}% for ${T}m (EMI ${emi.toFixed(2)})`,
  });

  return NextResponse.json({
    loan: {
      ...loan,
      principal: toNumber(loan.principal),
      interestRate: toNumber(loan.interestRate),
      emi: toNumber(loan.emi),
      outstanding: toNumber(loan.outstanding),
    },
  }, { status: 201 });
}
