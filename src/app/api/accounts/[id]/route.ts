import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/banking";

function serializeAccount<T extends {
  balance: unknown;
  interestRate: unknown;
  minBalance: unknown;
  transactions?: Array<{ amount: unknown; balanceAfter: unknown }>;
  cards?: Array<{ creditLimit: unknown; dailyLimit: unknown }>;
  loans?: Array<{ principal: unknown; interestRate: unknown; emi: unknown; outstanding: unknown }>;
}>(a: T) {
  return {
    ...a,
    balance: toNumber(a.balance),
    interestRate: toNumber(a.interestRate),
    minBalance: toNumber(a.minBalance),
    transactions: a.transactions?.map((t) => ({
      ...t,
      amount: toNumber(t.amount),
      balanceAfter: toNumber(t.balanceAfter),
    })),
    cards: a.cards?.map((c) => ({
      ...c,
      creditLimit: toNumber(c.creditLimit),
      dailyLimit: toNumber(c.dailyLimit),
    })),
    loans: a.loans?.map((l) => ({
      ...l,
      principal: toNumber(l.principal),
      interestRate: toNumber(l.interestRate),
      emi: toNumber(l.emi),
      outstanding: toNumber(l.outstanding),
    })),
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // `id` could be the Prisma id or accountNumber - try both
  let account = await db.account.findUnique({
    where: { id },
    include: {
      customer: true,
      branch: true,
      transactions: { take: 100, orderBy: { createdAt: "desc" } },
      cards: { orderBy: { createdAt: "desc" } },
      loans: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!account) {
    account = await db.account.findUnique({
      where: { accountNumber: id },
      include: {
        customer: true,
        branch: true,
        transactions: { take: 100, orderBy: { createdAt: "desc" } },
        cards: { orderBy: { createdAt: "desc" } },
        loans: { orderBy: { createdAt: "desc" } },
      },
    });
  }
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ account: serializeAccount(account) });
}
