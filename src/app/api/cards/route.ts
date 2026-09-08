import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateCardNumber, hashCvv, toNumber } from "@/lib/banking";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") ?? "";
  const status = searchParams.get("status") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;

  const cards = await db.card.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { customer: true, account: true },
  });
  // mask card numbers + convert Decimal limits
  const out = cards.map((c) => ({
    ...c,
    cardNumberMasked: c.cardNumber.slice(0, 4) + " **** **** " + c.cardNumber.slice(-4),
    creditLimit: toNumber(c.creditLimit),
    dailyLimit: toNumber(c.dailyLimit),
    cvvHash: undefined,
    pinHash: undefined,
    account: c.account
      ? {
          ...c.account,
          balance: toNumber(c.account.balance),
          interestRate: toNumber(c.account.interestRate),
          minBalance: toNumber(c.account.minBalance),
        }
      : null,
  }));
  return NextResponse.json({ cards: out });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { customerId, accountNumber, type, network, creditLimit, dailyLimit } =
    body as Record<string, unknown>;

  if (!customerId || !accountNumber || !type) {
    return NextResponse.json({ error: "customerId, accountNumber, type required" }, { status: 400 });
  }
  if (!["DEBIT", "CREDIT"].includes(type as string)) {
    return NextResponse.json({ error: "Invalid card type" }, { status: 400 });
  }

  const account = await db.account.findUnique({ where: { accountNumber: String(accountNumber) } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (account.customerId !== customerId)
    return NextResponse.json({ error: "Account does not belong to customer" }, { status: 400 });

  const cardNumber = generateCardNumber();
  const exists = await db.card.findUnique({ where: { cardNumber } });
  if (exists) return NextResponse.json({ error: "Card number collision, retry" }, { status: 500 });

  // random CVV
  const cvv = String(Math.floor(Math.random() * 900 + 100));
  const now = new Date();
  const expiryMonth = now.getMonth() + 1;
  const expiryYear = now.getFullYear() + 5;

  const card = await db.card.create({
    data: {
      cardNumber,
      customerId: String(customerId),
      accountNumber: String(accountNumber),
      type: type as string,
      network: (network as string) || "VISA",
      expiryMonth,
      expiryYear,
      cvvHash: hashCvv(cvv),
      status: "ACTIVE",
      creditLimit: Number(creditLimit ?? (type === "CREDIT" ? 100000 : 0)),
      dailyLimit: Number(dailyLimit ?? 50000),
    },
  });

  await recordAudit({
    userId: user.id,
    action: "CARD_ISSUE",
    entity: "CARD",
    entityId: card.id,
    details: `Issued ${type} card ****${cardNumber.slice(-4)} for customer ${customerId}`,
  });

  // return with the unmasked cvv once for demo
  return NextResponse.json({
    card: {
      ...card,
      cardNumberMasked: cardNumber.slice(0, 4) + " **** **** " + cardNumber.slice(-4),
      creditLimit: toNumber(card.creditLimit),
      dailyLimit: toNumber(card.dailyLimit),
    },
    cvv, // demo: return CVV once
  }, { status: 201 });
}
