import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

function generateRef() {
  return `QRP${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
}

// POST /api/qr/pay — simulate a payer scanning a QR and paying into the linked account
// Used to test inward collection flow without an actual UPI app.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { upiId, payerName, payerUpiId, amount } = body as Record<string, unknown>;
  if (!upiId || !payerName || !payerUpiId || !amount) {
    return NextResponse.json({ error: "upiId, payerName, payerUpiId, amount required" }, { status: 400 });
  }
  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const qr = await db.qrCode.findUnique({
    where: { upiId: String(upiId) },
    include: { account: true },
  });
  if (!qr) return NextResponse.json({ error: "QR / UPI ID not found" }, { status: 404 });
  if (qr.status !== "ACTIVE") return NextResponse.json({ error: "QR is not active" }, { status: 400 });
  if (qr.amount && Math.abs(qr.amount - amt) > 0.01) {
    return NextResponse.json({ error: `QR is for a fixed amount of ₹${qr.amount}` }, { status: 400 });
  }

  return db
    .$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { accountNumber: qr.accountNumber } });
      if (!account || account.status !== "ACTIVE") throw new Error("Linked account not active");
      const newBalance = account.balance + amt;
      await tx.account.update({
        where: { accountNumber: account.accountNumber },
        data: { balance: newBalance },
      });
      const txn = await tx.transaction.create({
        data: {
          txnRef: `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900000 + 100000)}`,
          accountNumber: account.accountNumber,
          type: "QR_IN",
          amount: amt,
          balanceAfter: newBalance,
          description: `QR payment from ${payerName} (${payerUpiId})`,
          counterparty: String(payerUpiId),
          channel: "QR",
          status: "SUCCESS",
        },
      });
      const ref = generateRef();
      const payment = await tx.qrPayment.create({
        data: {
          qrId: qr.id,
          accountNumber: account.accountNumber,
          payerName: String(payerName),
          payerUpiId: String(payerUpiId),
          amount: amt,
          refNo: ref,
          status: "SUCCESS",
          direction: "INWARD",
        },
      });
      await tx.qrCode.update({ where: { id: qr.id }, data: { scans: { increment: 1 } } });
      return { payment, txn };
    }, { timeout: 30000, maxWait: 15000 })
    .then(async ({ payment, txn }) => {
      // Send SMS alert to the receiving customer
      const customer = await db.customer.findFirst({
        where: { accounts: { some: { accountNumber: qr.accountNumber } } },
      });
      if (customer) {
        await db.smsLog.create({
          data: {
            customerId: customer.id,
            phone: customer.phone,
            message: `₹${amt} credited via QR from ${payerName}. Avl Bal updated. Ref ${payment.refNo}. -CBS Bank`,
            type: "TXN_ALERT",
            status: "SENT",
          },
        });
      }
      return NextResponse.json({ payment, txn }, { status: 201 });
    })
    .catch((e: unknown) =>
      NextResponse.json({ error: e instanceof Error ? e.message : "Payment failed" }, { status: 400 })
    );
}
