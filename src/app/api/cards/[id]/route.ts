import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/banking";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let card = await db.card.findUnique({
    where: { id },
    include: { customer: true, account: true },
  });
  if (!card) {
    card = await db.card.findFirst({
      where: { cardNumber: id },
      include: { customer: true, account: true },
    });
  }
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const out = {
    ...card,
    cardNumberMasked: card.cardNumber.slice(0, 4) + " **** **** " + card.cardNumber.slice(-4),
    creditLimit: toNumber(card.creditLimit),
    dailyLimit: toNumber(card.dailyLimit),
    account: card.account
      ? {
          ...card.account,
          balance: toNumber(card.account.balance),
          interestRate: toNumber(card.account.interestRate),
          minBalance: toNumber(card.account.minBalance),
        }
      : null,
    cvvHash: undefined,
    pinHash: undefined,
  };
  return NextResponse.json({ card: out });
}
