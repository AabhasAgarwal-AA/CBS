import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { generateTxnRef } from "@/lib/banking";

function generateReceiptNo() {
  const d = new Date();
  const ymd =
    d.getFullYear().toString().slice(-2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  return `RCP-${ymd}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

// GET /api/field-collections?agentId=&date=&limit=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") ?? "";
  const date = searchParams.get("date") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (agentId) where.agentId = agentId;
  if (date) {
    const day = new Date(date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    where.collectedAt = { gte: day, lt: next };
  }
  const collections = await db.fieldCollection.findMany({
    where,
    take: limit,
    orderBy: { collectedAt: "desc" },
    include: {
      agent: { select: { agentCode: true, name: true } },
      customer: { select: { fullName: true, customerNo: true, phone: true } },
      account: { select: { accountNumber: true, type: true } },
    },
  });
  // Total summary
  const total = collections.reduce((s, c) => s + c.amount, 0);
  return NextResponse.json({ collections, total, count: collections.length });
}

// POST /api/field-collections — agent records a cash collection from a customer's doorstep
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { agentId, accountNumber, amount, location } = body as Record<string, unknown>;
  if (!agentId || !accountNumber || !amount) {
    return NextResponse.json({ error: "agentId, accountNumber, amount required" }, { status: 400 });
  }
  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  const agent = await db.agent.findUnique({ where: { id: String(agentId) } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  if (agent.status !== "ACTIVE") return NextResponse.json({ error: "Agent not active" }, { status: 400 });
  const account = await db.account.findUnique({
    where: { accountNumber: String(accountNumber) },
    include: { customer: true },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (account.status !== "ACTIVE") return NextResponse.json({ error: "Account not active" }, { status: 400 });

  return db
    .$transaction(async (tx) => {
      const receiptNo = generateReceiptNo();
      const collection = await tx.fieldCollection.create({
        data: {
          agentId: agent.id,
          customerId: account.customerId,
          accountNumber: account.accountNumber,
          amount: amt,
          receiptNo,
          location: (location as string) || null,
          status: "COLLECTED",
        },
      });
      // Credit the linked account immediately (in this demo). In real Pigmy schemes,
      // funds stay with the agent until end-of-day deposit at the branch.
      const newBalance = account.balance + amt;
      await tx.account.update({
        where: { accountNumber: account.accountNumber },
        data: { balance: newBalance },
      });
      await tx.transaction.create({
        data: {
          txnRef: generateTxnRef(),
          accountNumber: account.accountNumber,
          type: "PIGMY_COLLECT",
          amount: amt,
          balanceAfter: newBalance,
          description: `Field collection by ${agent.name} (${agent.agentCode}), receipt ${receiptNo}`,
          channel: "AGENT",
          status: "SUCCESS",
        },
      });
      // Update agent stats
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          totalCollections: { increment: amt },
          todayCollections: { increment: amt },
        },
      });
      return { collection, customer: account.customer };
    }, { timeout: 30000, maxWait: 15000 })
    .then(async ({ collection, customer }) => {
      // SMS receipt to customer
      if (customer) {
        await db.smsLog.create({
          data: {
            customerId: customer.id,
            phone: customer.phone,
            message: `₹${amt} collected by ${agent.name} (${agent.agentCode}). Receipt: ${collection.receiptNo}. -CBS Bank`,
            type: "TXN_ALERT",
            status: "SENT",
          },
        });
      }
      await recordAudit({
        userId: null, // agent-originated; no staff user
        action: "FIELD_COLLECTION",
        entity: "FIELD_COLLECTION",
        entityId: collection.id,
        details: `Agent ${agent.agentCode} collected ₹${amt} from ${account.customer.fullName} (${account.accountNumber}) receipt ${collection.receiptNo}`,
      });
      return NextResponse.json({ collection }, { status: 201 });
    })
    .catch((e: unknown) =>
      NextResponse.json({ error: e instanceof Error ? e.message : "Collection failed" }, { status: 400 })
    );
}
