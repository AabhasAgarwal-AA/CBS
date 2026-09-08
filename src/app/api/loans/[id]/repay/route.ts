import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateTxnRef, toNumber } from "@/lib/banking";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  let loan = await db.loan.findUnique({ where: { id }, include: { account: true } });
  if (!loan) loan = await db.loan.findUnique({ where: { loanNumber: id }, include: { account: true } });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (loan.status !== "DISBURSED") return NextResponse.json({ error: "Loan not disbursed" }, { status: 400 });

  // Convert Decimals to JS numbers for arithmetic
  const outstanding = toNumber(loan.outstanding);
  const rate = toNumber(loan.interestRate);

  // interest = outstanding * rate / 12 / 100
  const interestPart = outstanding * (rate / 100 / 12);
  const principalPart = Math.min(amount - interestPart, outstanding);
  if (principalPart < 0) return NextResponse.json({ error: "Amount less than interest due" }, { status: 400 });

  const newOutstanding = outstanding - principalPart;

  return db
    .$transaction(async (tx) => {
      // debit the linked account if exists
      let balanceAfter = 0;
      if (loan!.accountNumber) {
        const acct = await tx.account.findUnique({ where: { accountNumber: loan!.accountNumber! } });
        if (acct && acct.status === "ACTIVE") {
          const acctBal = toNumber(acct.balance);
          if (acctBal < amount) throw new Error("Linked account has insufficient balance");
          balanceAfter = acctBal - amount;
          await tx.account.update({
            where: { accountNumber: acct.accountNumber },
            data: { balance: balanceAfter },
          });
          await tx.transaction.create({
            data: {
              txnRef: generateTxnRef(),
              accountNumber: acct.accountNumber,
              type: "WITHDRAW",
              amount,
              balanceAfter,
              description: `Loan EMI payment ${loan!.loanNumber}`,
              channel: "TELLER",
              status: "SUCCESS",
            },
          });
        }
      }

      const repayment = await tx.loanRepayment.create({
        data: {
          loanId: loan!.id,
          amount,
          principalPart,
          interestPart,
          balanceAfter: newOutstanding,
        },
      });

      loan = await tx.loan.update({
        where: { id: loan!.id },
        data: {
          outstanding: newOutstanding,
          status: newOutstanding <= 0.5 ? "CLOSED" : "DISBURSED",
        },
        include: { account: true },
      });

      return { repayment, loan };
    }, { timeout: 30000, maxWait: 15000 })
    .then(async ({ repayment, loan }) => {
      await recordAudit({
        userId: user.id,
        action: "LOAN_REPAY",
        entity: "LOAN",
        entityId: loan.id,
        details: `Repayment ${amount} on loan ${loan.loanNumber} (principal ${principalPart.toFixed(2)}, interest ${interestPart.toFixed(2)}), outstanding ${newOutstanding.toFixed(2)}`,
      });
      return NextResponse.json({
        repayment: {
          ...repayment,
          amount: toNumber(repayment.amount),
          principalPart: toNumber(repayment.principalPart),
          interestPart: toNumber(repayment.interestPart),
          balanceAfter: toNumber(repayment.balanceAfter),
        },
        loan: {
          ...loan,
          principal: toNumber(loan.principal),
          interestRate: toNumber(loan.interestRate),
          emi: toNumber(loan.emi),
          outstanding: toNumber(loan.outstanding),
          account: loan.account
            ? {
                ...loan.account,
                balance: toNumber(loan.account.balance),
                interestRate: toNumber(loan.account.interestRate),
                minBalance: toNumber(loan.account.minBalance),
              }
            : null,
        },
      });
    })
    .catch((e: unknown) =>
      NextResponse.json({ error: e instanceof Error ? e.message : "Repayment failed" }, { status: 400 })
    );
}
