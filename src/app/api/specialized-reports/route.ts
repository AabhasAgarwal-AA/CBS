import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/specialized-reports?type=  — generates various specialized reports
// Types: NDH3 | FUND_POSITION | MATURITY_TD | MATURITY_CLOSED | INTEREST_PAID |
//        NEFT_REQUEST | DEPOSIT_BALANCE | COLLECTION_SUMMARY | SHARE_HOLDER |
//        CORPORATE_STATEMENT | LATE_FEES | PENDING_INSTALLMENTS
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "FUND_POSITION";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  switch (type) {
    case "NDH3": {
      // NDH-3 report: aggregate deposit balances by account type
      const accounts = await db.account.findMany({ where: { status: "ACTIVE" } });
      const byType: Record<string, { count: number; balance: number }> = {};
      for (const a of accounts) {
        const t = a.type;
        if (!byType[t]) byType[t] = { count: 0, balance: 0 };
        byType[t].count++;
        byType[t].balance += a.balance;
      }
      return NextResponse.json({ type, generatedAt: new Date(), data: byType });
    }
    case "FUND_POSITION": {
      // Fund position: total deposits vs total loans vs cash in hand
      const [accounts, loans] = await Promise.all([
        db.account.findMany(),
        db.loan.findMany({ where: { status: "DISBURSED" } }),
      ]);
      const totalDeposits = accounts.reduce((s, a) => s + a.balance, 0);
      const totalLoansOutstanding = loans.reduce((s, l) => s + l.outstanding, 0);
      const totalActiveAccounts = accounts.filter((a) => a.status === "ACTIVE").length;
      const cashInHand = totalDeposits - totalLoansOutstanding;
      return NextResponse.json({
        type,
        generatedAt: new Date(),
        data: { totalDeposits, totalLoansOutstanding, cashInHand, totalActiveAccounts },
      });
    }
    case "MATURITY_TD": {
      // TD maturity: FD accounts maturing in next 30 days
      const now = new Date();
      const future = new Date(now);
      future.setDate(future.getDate() + 30);
      const accounts = await db.account.findMany({
        where: { type: "FIXED_DEPOSIT", status: "ACTIVE" },
        include: { customer: { select: { fullName: true, customerNo: true, phone: true } } },
      });
      // Approximate maturity as openedAt + 12 months (demo — real FDs have a maturityDate field)
      const maturing = accounts.map((a) => {
        const maturity = new Date(a.openedAt);
        maturity.setMonth(maturity.getMonth() + 12);
        return { ...a, maturityDate: maturity, daysToMaturity: Math.ceil((maturity.getTime() - now.getTime()) / 86400000) };
      }).filter((a) => a.daysToMaturity <= 30 && a.daysToMaturity >= -30);
      return NextResponse.json({ type, generatedAt: new Date(), data: maturing });
    }
    case "MATURITY_CLOSED": {
      // Closed maturity: accounts closed in date range
      const where: Record<string, unknown> = { status: "CLOSED" };
      if (from || to) where.closedAt = dateFilter;
      const accounts = await db.account.findMany({
        where,
        include: { customer: { select: { fullName: true, customerNo: true } } },
      });
      return NextResponse.json({ type, generatedAt: new Date(), data: accounts });
    }
    case "INTEREST_PAID": {
      // Interest paid: sum of INTEREST-type transactions
      const where: Record<string, unknown> = { type: "INTEREST" };
      if (from || to) where.createdAt = dateFilter;
      const txns = await db.transaction.findMany({ where });
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return NextResponse.json({ type, generatedAt: new Date(), data: { count: txns.length, total, transactions: txns.slice(0, 100) } });
    }
    case "NEFT_REQUEST": {
      // NEFT request report: all NEFT payment orders
      const payments = await db.paymentOrder.findMany({
        where: { mode: "NEFT" },
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { fullName: true, customerNo: true } } },
      });
      return NextResponse.json({ type, generatedAt: new Date(), data: payments });
    }
    case "DEPOSIT_BALANCE": {
      // Deposit balance report: all accounts with balances
      const accounts = await db.account.findMany({
        include: { customer: { select: { fullName: true, customerNo: true } } },
        orderBy: { balance: "desc" },
      });
      return NextResponse.json({ type, generatedAt: new Date(), data: accounts });
    }
    case "COLLECTION_SUMMARY": {
      // Collection summary: daily/branch collection totals
      const collections = await db.fieldCollection.findMany({
        include: { agent: { select: { agentCode: true, name: true, branch: { select: { name: true, city: true } } } } },
      });
      const byBranch: Record<string, { count: number; total: number }> = {};
      for (const c of collections) {
        const branchName = c.agent.branch?.name ?? "Unassigned";
        if (!byBranch[branchName]) byBranch[branchName] = { count: 0, total: 0 };
        byBranch[branchName].count++;
        byBranch[branchName].total += c.amount;
      }
      const grandTotal = collections.reduce((s, c) => s + c.amount, 0);
      return NextResponse.json({ type, generatedAt: new Date(), data: { byBranch, grandTotal, totalCollections: collections.length } });
    }
    case "SHARE_HOLDER": {
      // Share holder report: all active shares
      const shares = await db.share.findMany({
        where: { status: "ACTIVE" },
        include: { customer: { select: { fullName: true, customerNo: true, phone: true } } },
      });
      const totalQty = shares.reduce((s, sh) => s + sh.quantity, 0);
      const totalValue = shares.reduce((s, sh) => s + sh.paidValue * sh.quantity, 0);
      return NextResponse.json({ type, generatedAt: new Date(), data: { shares, totalQty, totalValue, holderCount: shares.length } });
    }
    case "CORPORATE_STATEMENT": {
      // Corporate account statement: transactions for a specific account
      const accountNumber = searchParams.get("accountNumber") ?? "";
      if (!accountNumber) return NextResponse.json({ error: "accountNumber required for CORPORATE_STATEMENT" }, { status: 400 });
      const txns = await db.transaction.findMany({
        where: { accountNumber },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      const account = await db.account.findUnique({ where: { accountNumber } });
      return NextResponse.json({ type, generatedAt: new Date(), data: { account, transactions: txns } });
    }
    case "LATE_FEES": {
      // Late fees report: FEE-type transactions
      const txns = await db.transaction.findMany({
        where: { type: "FEE" },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const total = txns.reduce((s, t) => s + t.amount, 0);
      return NextResponse.json({ type, generatedAt: new Date(), data: { count: txns.length, total, transactions: txns } });
    }
    case "PENDING_INSTALLMENTS": {
      // Pending installments: disbursed loans with outstanding > 0
      const loans = await db.loan.findMany({
        where: { status: "DISBURSED", outstanding: { gt: 0 } },
        include: { customer: { select: { fullName: true, customerNo: true, phone: true } } },
        orderBy: { outstanding: "desc" },
      });
      const totalOutstanding = loans.reduce((s, l) => s + l.outstanding, 0);
      return NextResponse.json({ type, generatedAt: new Date(), data: { loans, totalOutstanding, count: loans.length } });
    }
    default:
      return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 });
  }
}
