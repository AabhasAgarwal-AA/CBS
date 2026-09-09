import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

// POST /api/bank-reconciliation/[id]/match — match a bank stmt entry to a payment order
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { matchedPaymentId, matchedTxnRef } = body as Record<string, unknown>;
  const record = await db.bankReconciliation.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.status === "MATCHED") return NextResponse.json({ error: "Already matched" }, { status: 400 });
  const updated = await db.bankReconciliation.update({
    where: { id },
    data: {
      matchedPaymentId: (matchedPaymentId as string) || null,
      matchedTxnRef: (matchedTxnRef as string) || null,
      status: "MATCHED",
      matchedAt: new Date(),
    },
  });
  await recordAudit({
    userId: user.id,
    action: "RECON_MATCH",
    entity: "BANK_RECONCILIATION",
    entityId: id,
    details: `Matched bank ref ${record.bankRefNo} to payment ${matchedPaymentId ?? "—"}`,
  });
  return NextResponse.json({ record: updated });
}
