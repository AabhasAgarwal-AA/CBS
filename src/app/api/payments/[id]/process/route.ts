import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { generateTxnRef } from "@/lib/banking";

function generateUtr() {
  return `UTR${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") {
    return NextResponse.json({ error: "Only Admin/Manager can process payments" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const payment = await db.paymentOrder.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payment.status !== "APPROVED") {
    return NextResponse.json({ error: `Payment must be APPROVED to process (current: ${payment.status})` }, { status: 400 });
  }

  return db
    .$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { accountNumber: payment.fromAccount } });
      if (!account) throw new Error("Source account not found");
      if (account.balance < payment.amount) throw new Error("Insufficient balance");
      const newBalance = account.balance - payment.amount;
      await tx.account.update({
        where: { accountNumber: account.accountNumber },
        data: { balance: newBalance },
      });
      const txn = await tx.transaction.create({
        data: {
          txnRef: generateTxnRef(),
          accountNumber: account.accountNumber,
          type: `${payment.mode}_OUT`,
          amount: payment.amount,
          balanceAfter: newBalance,
          description: `${payment.mode} to ${payment.beneficiaryName} (${payment.beneficiaryAccount}/${payment.beneficiaryIfsc}) ref ${payment.refNo}`,
          counterparty: payment.beneficiaryAccount,
          channel: payment.mode,
          status: "SUCCESS",
        },
      });
      const utr = generateUtr();
      const updated = await tx.paymentOrder.update({
        where: { id: payment.id },
        data: { status: "PROCESSED", processedAt: new Date(), utrNo: utr },
      });
      return { payment: updated, txn };
    }, { timeout: 30000, maxWait: 15000 })
    .then(async ({ payment: updated, txn }) => {
      // Send SMS alert
      const customer = await db.customer.findUnique({ where: { id: updated.customerId } });
      if (customer) {
        await db.smsLog.create({
          data: {
            customerId: customer.id,
            phone: customer.phone,
            message: `₹${updated.amount} debited via ${updated.mode} to ${updated.beneficiaryName}. UTR: ${updated.utrNo}. Avl Bal updated. -CBS Bank`,
            type: "TXN_ALERT",
            status: "SENT",
          },
        });
      }
      await recordAudit({
        userId: user.id,
        action: "PAYMENT_PROCESS",
        entity: "PAYMENT",
        entityId: updated.id,
        details: `Processed ${updated.mode} ₹${updated.amount} ref ${updated.refNo} UTR ${updated.utrNo}`,
      });
      return NextResponse.json({ payment: updated, txn });
    })
    .catch((e: unknown) =>
      NextResponse.json({ error: e instanceof Error ? e.message : "Processing failed" }, { status: 400 })
    );
}
