import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const status = searchParams.get("status") ?? "";
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const records = await db.bankReconciliation.findMany({
    where,
    take: limit,
    orderBy: { statementDate: "desc" },
  });
  const matched = records.filter((r) => r.status === "MATCHED").length;
  const unmatched = records.filter((r) => r.status === "UNMATCHED").length;
  const totalInward = records.filter((r) => r.direction === "INWARD").reduce((s, r) => s + r.amount, 0);
  return NextResponse.json({ records, matched, unmatched, totalInward });
}

// POST — upload a bank statement entry (simulated)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bankRefNo, amount, mode, direction, senderName, senderAccount, senderIfsc, statementDate } =
    body as Record<string, unknown>;
  if (!bankRefNo || !amount || !mode || !statementDate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const existing = await db.bankReconciliation.findUnique({ where: { bankRefNo: String(bankRefNo) } });
  if (existing) return NextResponse.json({ error: "Bank ref no already exists" }, { status: 400 });
  const record = await db.bankReconciliation.create({
    data: {
      bankRefNo: String(bankRefNo),
      amount: Number(amount),
      mode: String(mode),
      direction: (direction as string) || "INWARD",
      senderName: (senderName as string) || null,
      senderAccount: (senderAccount as string) || null,
      senderIfsc: (senderIfsc as string) || null,
      statementDate: new Date(statementDate as string),
      status: "UNMATCHED",
    },
  });
  await recordAudit({
    userId: user.id,
    action: "BANK_STMT_IMPORT",
    entity: "BANK_RECONCILIATION",
    entityId: record.id,
    details: `Imported bank stmt entry ${bankRefNo} ₹${amount} ${mode}`,
  });
  return NextResponse.json({ record }, { status: 201 });
}
