import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-session";

// GET /api/customer-portal/mini-statement — last 10 transactions across all customer accounts
export async function GET(req: NextRequest) {
  const token = req.cookies.get("cbs_customer_token")?.value ?? null;
  const session = getCustomerSession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await db.account.findMany({
    where: { customerId: session.id },
    select: { accountNumber: true },
  });
  const accountNumbers = accounts.map((a) => a.accountNumber);
  const txns = await db.transaction.findMany({
    where: { accountNumber: { in: accountNumbers } },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ transactions: txns });
}
