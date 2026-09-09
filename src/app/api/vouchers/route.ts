import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const type = searchParams.get("type") ?? "";
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  const vouchers = await db.voucher.findMany({
    where,
    take: limit,
    orderBy: { date: "desc" },
    include: {
      vendor: { select: { name: true, vendorCode: true } },
      lines: { include: { ledger: { select: { name: true, group: { select: { name: true } } } } } },
    },
  });
  return NextResponse.json({ vouchers });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { type, vendorId, date, amount, description, reference, lines } = body as Record<string, unknown>;
  if (!type || !amount || !lines || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "type, amount, and 2+ lines required" }, { status: 400 });
  }
  const totalDebit = (lines as any[]).reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCredit = (lines as any[]).reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json({ error: `Double-entry mismatch: debit ₹${totalDebit} ≠ credit ₹${totalCredit}` }, { status: 400 });
  }
  const voucherNo = `V-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 90000 + 10000)}`;
  const voucher = await db.voucher.create({
    data: {
      voucherNo,
      type: String(type),
      vendorId: (vendorId as string) || null,
      date: date ? new Date(date as string) : new Date(),
      amount: Number(amount),
      description: (description as string) || null,
      reference: (reference as string) || null,
      status: "POSTED",
      createdBy: user.id,
      lines: {
        create: (lines as any[]).map((l) => ({
          ledgerId: String(l.ledgerId),
          debit: Number(l.debit ?? 0),
          credit: Number(l.credit ?? 0),
          description: (l.description as string) || null,
        })),
      },
    },
    include: { lines: true },
  });
  // Update ledger balances
  for (const line of voucher.lines) {
    const ledger = await db.ledger.findUnique({ where: { id: line.ledgerId } });
    if (ledger) {
      const newBal = ledger.currentBalance + line.debit - line.credit;
      await db.ledger.update({ where: { id: ledger.id }, data: { currentBalance: newBal } });
    }
  }
  await recordAudit({
    userId: user.id, action: "VOUCHER_CREATE", entity: "VOUCHER", entityId: voucher.id,
    details: `Posted ${type} voucher ${voucherNo} for ₹${amount}`,
  });
  return NextResponse.json({ voucher }, { status: 201 });
}
