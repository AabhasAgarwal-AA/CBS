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

  let loan = await db.loan.findUnique({ where: { id }, include: { customer: true } });
  if (!loan) loan = await db.loan.findUnique({ where: { loanNumber: id }, include: { customer: true } });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (loan.status !== "APPROVED")
    return NextResponse.json({ error: `Loan must be APPROVED to disburse (current: ${loan.status})` }, { status: 400 });

  return db
    .$transaction(async (tx) => {
      // find or create a disbursement account for the customer
      let account = loan!.accountNumber
        ? await tx.account.findUnique({ where: { accountNumber: loan!.accountNumber } })
        : await tx.account.findFirst({
            where: { customerId: loan!.customerId, status: "ACTIVE" },
          });

      if (!account) {
        // create a new SAVINGS account
        let acctNo = "";
        for (let i = 0; i < 5; i++) {
          acctNo = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
          if (acctNo[0] === "0") acctNo = "1" + acctNo.slice(1);
          const ex = await tx.account.findUnique({ where: { accountNumber: acctNo } });
          if (!ex) break;
        }
        account = await tx.account.create({
          data: {
            accountNumber: acctNo,
            customerId: loan!.customerId,
            type: "SAVINGS",
            balance: 0,
            currency: "INR",
            status: "ACTIVE",
            interestRate: 3.5,
            minBalance: 1000,
          },
        });
        loan = await tx.loan.update({
          where: { id: loan!.id },
          data: { accountNumber: acctNo },
        });
      }

      // Convert Decimals to JS numbers for arithmetic
      const principal = toNumber(loan!.principal);
      const currentBalance = toNumber(account.balance);
      const newBalance = currentBalance + principal;

      account = await tx.account.update({
        where: { accountNumber: account.accountNumber },
        data: { balance: newBalance },
      });

      await tx.transaction.create({
        data: {
          txnRef: generateTxnRef(),
          accountNumber: account.accountNumber,
          type: "DEPOSIT",
          amount: principal,
          balanceAfter: newBalance,
          description: `Loan disbursement ${loan!.loanNumber}`,
          channel: "TELLER",
          status: "SUCCESS",
        },
      });

      loan = await tx.loan.update({
        where: { id: loan!.id },
        data: {
          status: "DISBURSED",
          disbursedAt: new Date(),
          outstanding: principal,
        },
        include: { customer: true },
      });

      return { loan, account, principal };
    }, { timeout: 30000, maxWait: 15000 })
    .then(async ({ loan, principal }) => {
      await recordAudit({
        userId: user.id,
        action: "LOAN_DISBURSE",
        entity: "LOAN",
        entityId: loan.id,
        details: `Disbursed loan ${loan.loanNumber} amount ${principal}`,
      });
      return NextResponse.json({
        loan: {
          ...loan,
          principal: toNumber(loan.principal),
          interestRate: toNumber(loan.interestRate),
          emi: toNumber(loan.emi),
          outstanding: toNumber(loan.outstanding),
        },
      });
    })
    .catch((e: unknown) =>
      NextResponse.json({ error: e instanceof Error ? e.message : "Disbursement failed" }, { status: 400 })
    );
}
