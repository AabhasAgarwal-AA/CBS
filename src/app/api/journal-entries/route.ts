import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const entries = await db.journalEntry.findMany({
    take: limit,
    orderBy: { date: "desc" },
    include: { lines: { include: { account: { select: { name: true, type: true } } } } },
  });
  return NextResponse.json({ entries });
}

// POST — create a journal entry (double-entry: debits must equal credits)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") return NextResponse.json({ error: "Admin/Manager only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { description, reference, lines } = body as Record<string, unknown>;
  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "At least 2 journal lines required" }, { status: 400 });
  }
  const totalDebit = (lines as any[]).reduce((s, l) => s + Number(l.debit ?? 0), 0);
  const totalCredit = (lines as any[]).reduce((s, l) => s + Number(l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json({ error: `Double-entry mismatch: debits ₹${totalDebit} ≠ credits ₹${totalCredit}` }, { status: 400 });
  }
  // Validate all account codes exist
  const codes = (lines as any[]).map((l) => String(l.accountCode));
  const accounts = await db.chartOfAccount.findMany({ where: { code: { in: codes } } });
  if (accounts.length !== codes.length) {
    return NextResponse.json({ error: "One or more account codes not found" }, { status: 400 });
  }
  const entryNo = `JE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 90000 + 10000)}`;
  const entry = await db.journalEntry.create({
    data: {
      entryNo,
      description: (description as string) || null,
      reference: (reference as string) || null,
      status: "POSTED",
      lines: {
        create: (lines as any[]).map((l) => ({
          accountCode: String(l.accountCode),
          debit: Number(l.debit ?? 0),
          credit: Number(l.credit ?? 0),
          description: (l.description as string) || null,
        })),
      },
    },
    include: { lines: true },
  });
  await recordAudit({
    userId: user.id,
    action: "JE_CREATE",
    entity: "JOURNAL_ENTRY",
    entityId: entry.id,
    details: `Posted journal entry ${entryNo} (₹${totalDebit} debit = ₹${totalCredit} credit)`,
  });
  return NextResponse.json({ entry }, { status: 201 });
}
