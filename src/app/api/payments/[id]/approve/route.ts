import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") {
    return NextResponse.json({ error: "Only Admin/Manager can approve payments" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const payment = await db.paymentOrder.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payment.status !== "PENDING") {
    return NextResponse.json({ error: `Payment is ${payment.status}` }, { status: 400 });
  }
  const updated = await db.paymentOrder.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  await recordAudit({
    userId: user.id,
    action: "PAYMENT_APPROVE",
    entity: "PAYMENT",
    entityId: id,
    details: `Approved ${payment.mode} ₹${payment.amount} ref ${payment.refNo}`,
  });
  return NextResponse.json({ payment: updated });
}
