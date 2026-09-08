import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateTxnRef, toNumber } from "@/lib/banking";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountNumber = searchParams.get("accountNumber") ?? "";
  const type = searchParams.get("type") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const where: Record<string, unknown> = {};
  if (accountNumber) where.accountNumber = accountNumber;
  if (type) where.type = type;

  const txns = await db.transaction.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  // Convert Decimal fields for JSON serialization
  const out = txns.map((t) => ({
    ...t,
    amount: toNumber(t.amount),
    balanceAfter: toNumber(t.balanceAfter),
  }));
  return NextResponse.json({ transactions: out });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    accountNumber,
    type,
    amount,
    description,
    counterpartyAccount,
    channel,
  } = body as Record<string, unknown>;

  if (!accountNumber || !type || !amount) {
    return NextResponse.json({ error: "accountNumber, type, amount required" }, { status: 400 });
  }
  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });

  const validTypes = ["DEPOSIT", "WITHDRAW", "TRANSFER_IN", "TRANSFER_OUT"];
  if (!validTypes.includes(type as string)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  return db
    .$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { accountNumber: String(accountNumber) } });
      if (!account) throw new Error("Account not found");
      if (account.status !== "ACTIVE") throw new Error("Account is not active");

      // Convert Decimal balances to JS numbers for arithmetic
      const currentBalance = toNumber(account.balance);
      const minBal = toNumber(account.minBalance);

      let newBalance: number;
      if (type === "DEPOSIT" || type === "TRANSFER_IN") {
        newBalance = currentBalance + amt;
      } else {
        newBalance = currentBalance - amt;
        if (newBalance < 0) throw new Error("Insufficient balance");
        if (account.type !== "CURRENT" && newBalance < minBal) {
          throw new Error(`Balance below minimum required (${minBal})`);
        }
      }

      const updated = await tx.account.update({
        where: { accountNumber: account.accountNumber },
        data: { balance: newBalance },
      });

      const txnRef = generateTxnRef();
      const txn = await tx.transaction.create({
        data: {
          txnRef,
          accountNumber: account.accountNumber,
          type: type as string,
          amount: amt,
          balanceAfter: newBalance,
          description: (description as string) || null,
          counterparty: (counterpartyAccount as string) || null,
          channel: (channel as string) || "TELLER",
          status: "SUCCESS",
        },
      });

      // For transfers, also process counterparty side
      if ((type === "TRANSFER_IN" || type === "TRANSFER_OUT") && counterpartyAccount) {
        const counter = await tx.account.findUnique({ where: { accountNumber: String(counterpartyAccount) } });
        if (counter && counter.status === "ACTIVE") {
          const counterCurrent = toNumber(counter.balance);
          const counterNewBal =
            type === "TRANSFER_OUT" ? counterCurrent + amt : counterCurrent - amt;
          if (counterNewBal < 0) {
            throw new Error("Counterparty insufficient balance");
          }
          await tx.account.update({
            where: { accountNumber: counter.accountNumber },
            data: { balance: counterNewBal },
          });
          await tx.transaction.create({
            data: {
              txnRef: generateTxnRef(),
              accountNumber: counter.accountNumber,
              type: type === "TRANSFER_OUT" ? "TRANSFER_IN" : "TRANSFER_OUT",
              amount: amt,
              balanceAfter: counterNewBal,
              description: (description as string) || `Transfer ref ${txnRef}`,
              counterparty: account.accountNumber,
              channel: (channel as string) || "TELLER",
              status: "SUCCESS",
            },
          });
        }
      }

      return { txn, account: updated };
    }, { timeout: 30000, maxWait: 15000 })
    .then(async ({ txn, account }) => {
      await recordAudit({
        userId: user.id,
        action: "TXN",
        entity: "TXN",
        entityId: txn.id,
        details: `${type} ${amt} on ${account.accountNumber} (ref ${txn.txnRef})`,
      });
      return NextResponse.json({
        txn: { ...txn, amount: toNumber(txn.amount), balanceAfter: toNumber(txn.balanceAfter) },
        account: {
          ...account,
          balance: toNumber(account.balance),
          interestRate: toNumber(account.interestRate),
          minBalance: toNumber(account.minBalance),
        },
      }, { status: 201 });
    })
    .catch((e: unknown) =>
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Transaction failed" },
        { status: 400 }
      )
    );
}
