import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateTxnRef } from "@/lib/banking";
import { recordAudit } from "@/lib/audit";

// POST /api/standing-instructions/[id]/run — manually trigger a SI run (cron would do this in prod)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const instr = await db.standingInstruction.findUnique({ where: { id } });
  if (!instr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (instr.status !== "ACTIVE") {
    return NextResponse.json({ error: `Instruction is ${instr.status}` }, { status: 400 });
  }

  return db
    .$transaction(async (tx) => {
      const from = await tx.account.findUnique({ where: { accountNumber: instr.fromAccount } });
      const to = await tx.account.findUnique({ where: { accountNumber: instr.toAccount } });
      if (!from || !to) throw new Error("Source or destination account not found");
      if (from.status !== "ACTIVE" || to.status !== "ACTIVE") throw new Error("Both accounts must be active");
      if (from.balance < instr.amount) throw new Error("Insufficient balance in source account");

      const newFromBal = from.balance - instr.amount;
      const newToBal = to.balance + instr.amount;
      await tx.account.update({
        where: { accountNumber: from.accountNumber },
        data: { balance: newFromBal },
      });
      await tx.account.update({
        where: { accountNumber: to.accountNumber },
        data: { balance: newToBal },
      });
      const txnRef1 = generateTxnRef();
      await tx.transaction.create({
        data: {
          txnRef: txnRef1,
          accountNumber: from.accountNumber,
          type: "TRANSFER_OUT",
          amount: instr.amount,
          balanceAfter: newFromBal,
          description: `Standing instruction (${instr.frequency}) to ${to.accountNumber}`,
          counterparty: to.accountNumber,
          channel: "ONLINE",
          status: "SUCCESS",
        },
      });
      await tx.transaction.create({
        data: {
          txnRef: generateTxnRef(),
          accountNumber: to.accountNumber,
          type: "TRANSFER_IN",
          amount: instr.amount,
          balanceAfter: newToBal,
          description: `Standing instruction (${instr.frequency}) from ${from.accountNumber}`,
          counterparty: from.accountNumber,
          channel: "ONLINE",
          status: "SUCCESS",
        },
      });
      // Compute next run
      let nextRun = new Date();
      if (instr.frequency === "DAILY") {
        nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (instr.frequency === "WEEKLY") {
        nextRun = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else {
        nextRun = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      const updated = await tx.standingInstruction.update({
        where: { id: instr.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: nextRun,
          totalRuns: { increment: 1 },
        },
      });
      return { instruction: updated, txnRef: txnRef1 };
    }, { timeout: 30000, maxWait: 15000 })
    .then(async ({ instruction, txnRef }) => {
      await recordAudit({
        userId: null,
        action: "SI_RUN",
        entity: "STANDING_INSTRUCTION",
        entityId: instruction.id,
        details: `Executed SI ₹${instr.amount} from ${instr.fromAccount} to ${instr.toAccount} ref ${txnRef}`,
      });
      return NextResponse.json({ instruction });
    })
    .catch((e: unknown) =>
      NextResponse.json({ error: e instanceof Error ? e.message : "SI run failed" }, { status: 400 })
    );
}
