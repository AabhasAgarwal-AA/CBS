import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/banking";

export async function GET() {
  const [customerCount, accountCount, loanCount, cardCount, users] = await Promise.all([
    db.customer.count(),
    db.account.count(),
    db.loan.count(),
    db.card.count(),
    db.user.findMany(),
  ]);

  const accounts = await db.account.findMany({ where: { status: "ACTIVE" } });
  const totalDeposits = accounts.reduce((s, a) => s + toNumber(a.balance), 0);

  const loans = await db.loan.findMany({
    where: { status: { in: ["DISBURSED", "APPROVED"] } },
  });
  const totalLoansOutstanding = loans.reduce((s, l) => s + toNumber(l.outstanding), 0);

  // 30-day transaction trend
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const recentTxns = await db.transaction.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const dayMap = new Map<string, { credit: number; debit: number }>();
  for (const t of recentTxns) {
    const d = t.createdAt.toISOString().slice(0, 10);
    const e = dayMap.get(d) ?? { credit: 0, debit: 0 };
    if (t.type === "DEPOSIT" || t.type === "TRANSFER_IN" || t.type === "INTEREST") {
      e.credit += toNumber(t.amount);
    } else {
      e.debit += toNumber(t.amount);
    }
    dayMap.set(d, e);
  }
  const trend = Array.from(dayMap.entries()).map(([date, v]) => ({
    date,
    credit: Math.round(v.credit),
    debit: Math.round(v.debit),
  }));

  // Account type distribution — _sum returns Decimal, must serialize as number
  const acctByType = await db.account.groupBy({
    by: ["type"],
    _count: true,
    _sum: { balance: true },
  });
  const acctByTypeOut = acctByType.map((a) => ({
    type: a.type,
    _count: a._count,
    _sum: { balance: toNumber(a._sum.balance) },
  }));

  // Loan type distribution
  const loanByType = await db.loan.groupBy({
    by: ["type"],
    _count: true,
    _sum: { outstanding: true },
  });
  const loanByTypeOut = loanByType.map((l) => ({
    type: l.type,
    _count: l._count,
    _sum: { outstanding: toNumber(l._sum.outstanding) },
  }));

  // Recent transactions — convert Decimal fields before JSON serialization
  const recentActivity = (await db.transaction.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
  })).map((t) => ({
    ...t,
    amount: toNumber(t.amount),
    balanceAfter: toNumber(t.balanceAfter),
  }));

  // Pending loans
  const pendingLoans = (await db.loan.findMany({
    where: { status: "PENDING" },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  })).map((l) => ({
    ...l,
    principal: toNumber(l.principal),
    interestRate: toNumber(l.interestRate),
    emi: toNumber(l.emi),
    outstanding: toNumber(l.outstanding),
  }));

  return NextResponse.json({
    customers: customerCount,
    accounts: accountCount,
    loans: loanCount,
    cards: cardCount,
    staffCount: users.length,
    totalDeposits,
    totalLoansOutstanding,
    trend,
    acctByType: acctByTypeOut,
    loanByType: loanByTypeOut,
    recentActivity,
    pendingLoans,
  });
}
