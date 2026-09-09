import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-session";

// GET /api/customer-portal/balance — returns all accounts of the logged-in customer
export async function GET(req: NextRequest) {
  const token = req.cookies.get("cbs_customer_token")?.value ?? null;
  const session = getCustomerSession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await db.account.findMany({
    where: { customerId: session.id, status: "ACTIVE" },
    select: {
      accountNumber: true,
      type: true,
      balance: true,
      currency: true,
      interestRate: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const loans = await db.loan.findMany({
    where: { customerId: session.id, status: "DISBURSED" },
    select: { loanNumber: true, type: true, outstanding: true, emi: true },
  });
  const cards = await db.card.findMany({
    where: { customerId: session.id, status: "ACTIVE" },
    select: { cardNumber: true, type: true, network: true, expiryMonth: true, expiryYear: true },
  });
  // Mask card numbers
  const cardsOut = cards.map((c) => ({
    ...c,
    cardNumber: c.cardNumber.slice(0, 4) + " **** **** " + c.cardNumber.slice(-4),
  }));
  return NextResponse.json({ customer: session, accounts, loans, cards: cardsOut });
}
