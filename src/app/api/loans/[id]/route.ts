import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/banking";

function serializeLoan<T extends {
  principal: unknown;
  interestRate: unknown;
  emi: unknown;
  outstanding: unknown;
  account?: { balance: unknown } | null;
  repayments?: Array<{ amount: unknown; principalPart: unknown; interestPart: unknown; balanceAfter: unknown }>;
}>(l: T) {
  return {
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
    repayments: l.repayments?.map((r) => ({
      ...r,
      amount: toNumber(r.amount),
      principalPart: toNumber(r.principalPart),
      interestPart: toNumber(r.interestPart),
      balanceAfter: toNumber(r.balanceAfter),
    })),
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let loan = await db.loan.findUnique({
    where: { id },
    include: { customer: true, account: true, repayments: { orderBy: { paidAt: "desc" } } },
  });
  if (!loan) {
    loan = await db.loan.findUnique({
      where: { loanNumber: id },
      include: { customer: true, account: true, repayments: { orderBy: { paidAt: "desc" } } },
    });
  }
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ loan: serializeLoan(loan) });
}
