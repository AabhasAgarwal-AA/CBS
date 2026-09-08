import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateAccountNumber, toNumber } from "@/lib/banking";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (customerId) where.customerId = customerId;
  if (q) {
    where.OR = [
      { accountNumber: { contains: q } },
      { customer: { fullName: { contains: q } } },
      { customer: { phone: { contains: q } } },
    ];
  }

  const accounts = await db.account.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { customer: true, branch: true },
  });
  // Convert Decimal fields for JSON serialization
  const out = accounts.map((a) => ({
    ...a,
    balance: toNumber(a.balance),
    interestRate: toNumber(a.interestRate),
    minBalance: toNumber(a.minBalance),
  }));
  return NextResponse.json({ accounts: out });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    customerId,
    type,
    initialDeposit,
    currency,
    interestRate,
    minBalance,
    branchId,
  } = body as Record<string, unknown>;

  if (!customerId || !type) {
    return NextResponse.json({ error: "customerId and type required" }, { status: 400 });
  }
  const validTypes = ["SAVINGS", "CURRENT", "FIXED_DEPOSIT", "RECURRING"];
  if (!validTypes.includes(type as string)) {
    return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
  }

  const customer = await db.customer.findUnique({ where: { id: String(customerId) } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const deposit = Number(initialDeposit ?? 0);
  if (deposit < 0) return NextResponse.json({ error: "Invalid deposit" }, { status: 400 });

  const acctNo = generateAccountNumber();
  // uniqueness check
  const exists = await db.account.findUnique({ where: { accountNumber: acctNo } });
  if (exists) return NextResponse.json({ error: "Account number collision, retry" }, { status: 500 });

  const defaults: Record<string, { interestRate: number; minBalance: number }> = {
    SAVINGS: { interestRate: 3.5, minBalance: 1000 },
    CURRENT: { interestRate: 0, minBalance: 5000 },
    FIXED_DEPOSIT: { interestRate: 6.5, minBalance: 10000 },
    RECURRING: { interestRate: 5.5, minBalance: 100 },
  };
  const def = defaults[type as string] ?? { interestRate: 0, minBalance: 0 };

  const account = await db.account.create({
    data: {
      accountNumber: acctNo,
      customerId: String(customerId),
      branchId: (branchId as string) || null,
      type: type as string,
      balance: deposit,
      currency: (currency as string) || "INR",
      interestRate: interestRate !== undefined ? Number(interestRate) : def.interestRate,
      minBalance: minBalance !== undefined ? Number(minBalance) : def.minBalance,
    },
  });

  // record initial deposit txn if any
  if (deposit > 0) {
    const txnRef = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900000 + 100000)}`;
    await db.transaction.create({
      data: {
        txnRef,
        accountNumber: acctNo,
        type: "DEPOSIT",
        amount: deposit,
        balanceAfter: deposit,
        description: "Initial deposit at account opening",
        channel: "TELLER",
        status: "SUCCESS",
      },
    });
  }

  await recordAudit({
    userId: user.id,
    action: "CREATE",
    entity: "ACCOUNT",
    entityId: account.id,
    details: `Opened ${type} account ${acctNo} for ${customer.fullName} (deposit ${deposit})`,
  });

  return NextResponse.json({
    account: {
      ...account,
      balance: toNumber(account.balance),
      interestRate: toNumber(account.interestRate),
      minBalance: toNumber(account.minBalance),
    },
  }, { status: 201 });
}
