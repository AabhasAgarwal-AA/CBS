import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/banking";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
  }

  const [txns, accounts, loans, customers, cards] = await Promise.all([
    db.transaction.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000 }),
    db.account.findMany(),
    db.loan.findMany(),
    db.customer.count(),
    db.card.count(),
  ]);

  const totalCredit = txns
    .filter((t) => t.type === "DEPOSIT" || t.type === "TRANSFER_IN" || t.type === "INTEREST")
    .reduce((s, t) => s + toNumber(t.amount), 0);
  const totalDebit = txns
    .filter((t) => t.type === "WITHDRAW" || t.type === "TRANSFER_OUT" || t.type === "FEE")
    .reduce((s, t) => s + toNumber(t.amount), 0);
  const totalDeposits = accounts.reduce((s, a) => s + toNumber(a.balance), 0);
  const totalLoansOutstanding = loans.reduce((s, l) => s + toNumber(l.outstanding), 0);
  const activeAccounts = accounts.filter((a) => a.status === "ACTIVE").length;

  const byType = await db.transaction.groupBy({
    by: ["type"],
    _count: true,
    _sum: { amount: true },
  });

  const byChannel = await db.transaction.groupBy({
    by: ["channel"],
    _count: true,
    _sum: { amount: true },
  });

  // Convert Decimal fields in transactions for JSON serialization
  const txnsOut = txns.slice(0, 500).map((t) => ({
    ...t,
    amount: toNumber(t.amount),
    balanceAfter: toNumber(t.balanceAfter),
  }));

  return NextResponse.json({
    period: { from, to },
    transactionCount: txns.length,
    totalCredit,
    totalDebit,
    totalDeposits,
    totalLoansOutstanding,
    activeAccounts,
    totalCustomers: customers,
    totalCards: cards,
    byType: byType.map((b) => ({ type: b.type, count: b._count, sum: toNumber(b._sum.amount) })),
    byChannel: byChannel.map((b) => ({ channel: b.channel, count: b._count, sum: toNumber(b._sum.amount) })),
    transactions: txnsOut,
  });
}
