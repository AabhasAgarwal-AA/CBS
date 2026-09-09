import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateAccountNumber,
  generateCardNumber,
  generateCustomerNo,
  generateLoanNo,
  generateTxnRef,
  calculateEMI,
  hashCvv,
  hashPassword,
} from "@/lib/banking";
import { createHash, randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

function hashMpin(mpin: string): string {
  return createHash("sha256").update(mpin + "::mpin-salt").digest("hex");
}

// Every table in the schema, ordered leaf -> root. TRUNCATE ... CASCADE makes the
// order irrelevant and, unlike a chain of deleteMany() calls, it runs as one
// statement so no other request can insert a child row midway through the wipe
// (which is what trips the RESTRICT foreign keys on Account/Transaction).
const ALL_TABLES = [
  "ModificationLog", "ApprovalRequest", "VoucherLine", "Voucher", "Vendor",
  "Ledger", "AccountGroup", "Salary", "Attendance", "Employee",
  "DesignationMenuRight", "Designation", "GoldLoanRelease", "GoldLoan",
  "JournalLine", "JournalEntry", "ChartOfAccount", "MasterSetting", "Overdraft",
  "SmsCharge", "BankReconciliation", "ECollection", "VirtualAccount",
  "MemberEnrollment", "GroupEnrollment", "ShareTransfer", "Share", "DepositPlan",
  "StandingInstruction", "FieldCollection", "Agent", "QrPayment", "QrCode",
  "PaymentOrder", "SmsLog", "Transaction", "LoanRepayment", "Card", "Loan",
  "Account", "Customer", "Branch", "User", "AuditLog",
];

function truncateSql() {
  const tables = ALL_TABLES.map((t) => `"public"."${t}"`).join(", ");
  return `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`;
}

// Serialise concurrent seed requests. Two overlapping seeds interleave badly:
// the second one wipes while the first is still inserting, and the first's new
// rows then violate the RESTRICT foreign keys.
let seedInFlight: Promise<unknown> | null = null;

// POST /api/seed - populates the database with demo data
export async function POST(_req: NextRequest) {
  if (seedInFlight) {
    return NextResponse.json(
      { error: "A seed is already running. Wait for it to finish before starting another." },
      { status: 409 },
    );
  }
  const run = seed();
  seedInFlight = run;
  try {
    return await run;
  } finally {
    seedInFlight = null;
  }
}

async function seed() {
  // The whole dataset is built in memory first, then written with one batched
  // transaction of createMany calls. The previous version issued ~800 sequential
  // round-trips, which took ~94s against a remote Postgres and blew past the
  // browser's patience long before it finished.
  const uid = () => randomUUID();

  // Uniqueness for @unique columns is enforced locally instead of by querying
  // the DB per row (the tables are empty after the truncate anyway).
  const uniq = (gen: () => string) => {
    const seen = new Set<string>();
    return () => {
      let v = gen();
      while (seen.has(v)) v = gen();
      seen.add(v);
      return v;
    };
  };
  const txnRef = uniq(generateTxnRef);
  const acctNo = uniq(generateAccountNumber);
  const cardNo = uniq(generateCardNumber);

  const nowMs = Date.now();
  const now = new Date(nowMs);
  const year = now.getFullYear();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");

  // ---- Branches ----
  const branches = [
    { id: uid(), code: "MUM01", name: "Mumbai Fort Main", city: "Mumbai", address: "Fort, Mumbai", ifsc: "CBSB0MUM01" },
    { id: uid(), code: "DEL01", name: "Delhi Connaught Place", city: "New Delhi", address: "CP, New Delhi", ifsc: "CBSB0DEL01" },
    { id: uid(), code: "BLR01", name: "Bangalore MG Road", city: "Bengaluru", address: "MG Road, Bengaluru", ifsc: "CBSB0BLR01" },
  ];

  // ---- Users ----
  const [adminPw, managerPw, tellerPw, agentPw] = await Promise.all([
    hashPassword("admin123"), hashPassword("manager123"), hashPassword("teller123"), hashPassword("agent123"),
  ]);
  const users = [
    { id: uid(), email: "admin@cbs.io", name: "Aarav Mehta", role: "ADMIN", password: adminPw, branch: branches[0].code },
    { id: uid(), email: "manager@cbs.io", name: "Priya Sharma", role: "MANAGER", password: managerPw, branch: branches[1].code },
    { id: uid(), email: "teller@cbs.io", name: "Rahul Verma", role: "TELLER", password: tellerPw, branch: branches[2].code },
  ];

  // ---- Customers ----
  const customerData = [
    { name: "Ananya Iyer", phone: "9876543210", city: "Mumbai", occupation: "Software Engineer", income: 1800000 },
    { name: "Karthik Reddy", phone: "9876543211", city: "Hyderabad", occupation: "Doctor", income: 2500000 },
    { name: "Sneha Patel", phone: "9876543212", city: "Ahmedabad", occupation: "Chartered Accountant", income: 1500000 },
    { name: "Vikram Singh", phone: "9876543213", city: "Jaipur", occupation: "Business Owner", income: 3500000 },
    { name: "Deepa Nair", phone: "9876543214", city: "Kochi", occupation: "Professor", income: 900000 },
    { name: "Arjun Das", phone: "9876543215", city: "Kolkata", occupation: "Architect", income: 1200000 },
    { name: "Meera Joshi", phone: "9876543216", city: "Pune", occupation: "Marketing Manager", income: 1400000 },
    { name: "Rohan Kapoor", phone: "9876543217", city: "Chandigarh", occupation: "Lawyer", income: 2200000 },
    { name: "Ishaan Gupta", phone: "9876543218", city: "Lucknow", occupation: "Govt Employee", income: 800000 },
    { name: "Lakshmi Menon", phone: "9876543219", city: "Chennai", occupation: "Pharmacist", income: 750000 },
  ];
  const demoMpin = hashMpin("1234"); // demo MPIN — customer mobile app login
  const customers: Prisma.CustomerCreateManyInput[] = customerData.map((c, i) => ({
    id: uid(),
    customerNo: generateCustomerNo(i + 1),
    fullName: c.name,
    email: `${c.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: c.phone,
    dob: new Date(1985 + (i % 10), i % 12, (i % 28) + 1),
    gender: i % 2 === 0 ? "FEMALE" : "MALE",
    address: `${i + 100} Sample Street`,
    city: c.city,
    state: c.city,
    pincode: `4000${i + 10}`,
    pan: `ABCDE${i}1234F`,
    aadhaar: `1234${i}5678${i}901`,
    occupation: c.occupation,
    annualIncome: c.income,
    kycStatus: "VERIFIED",
    kycDate: now,
    status: "ACTIVE",
    mpin: demoMpin,
    branchId: branches[i % branches.length].id,
  }));

  // ---- Accounts (1-3 per customer) + their opening deposit ----
  const types = ["SAVINGS", "CURRENT", "FIXED_DEPOSIT", "RECURRING"];
  const rateByType: Record<string, number> = { SAVINGS: 3.5, CURRENT: 0, FIXED_DEPOSIT: 6.5, RECURRING: 5.5 };
  const minByType: Record<string, number> = { SAVINGS: 1000, CURRENT: 5000, FIXED_DEPOSIT: 10000, RECURRING: 100 };

  type SeedAccount = { id: string; accountNumber: string; customerId: string; branchId: string | null; type: string; minBalance: number; interestRate: number };
  const accounts: SeedAccount[] = [];
  const transactions: Prisma.TransactionCreateManyInput[] = [];
  // Running balance per account. Every balance-moving section below updates this,
  // and the final value is what gets written as Account.balance.
  const balance = new Map<string, number>();

  // Sections below apply balance changes in source order, so their timestamps
  // have to increase in that same order — otherwise an account's newest row by
  // createdAt isn't the one that produced its stored balance, and statements
  // read as though the arithmetic is wrong. The timeline:
  //   opening deposit -> 30 days of activity -> QR inflows -> outward payments
  const OPENED_AT = new Date(nowMs - 31 * 86400 * 1000);

  for (let i = 0; i < customers.length; i++) {
    const numAccounts = (i % 3) + 1;
    for (let j = 0; j < numAccounts; j++) {
      const type = types[(i + j) % types.length];
      const initial = Math.floor(Math.random() * 900000) + 10000;
      const accountNumber = acctNo();
      accounts.push({
        id: uid(),
        accountNumber,
        customerId: customers[i].id!,
        branchId: (customers[i].branchId as string | null) ?? null,
        type,
        minBalance: minByType[type],
        interestRate: rateByType[type],
      });
      balance.set(accountNumber, initial);
      transactions.push({
        txnRef: txnRef(),
        accountNumber,
        type: "DEPOSIT",
        amount: initial,
        balanceAfter: initial,
        description: "Initial deposit",
        channel: "TELLER",
        status: "SUCCESS",
        createdAt: OPENED_AT,
      });
    }
  }

  // ---- Random transactions across the last 30 days ----
  for (let d = 30; d >= 1; d--) {
    const numTxns = Math.floor(Math.random() * 5) + 2;
    for (let t = 0; t < numTxns; t++) {
      const acct = accounts[Math.floor(Math.random() * accounts.length)];
      const isCredit = Math.random() > 0.5;
      const amt = Math.floor(Math.random() * 20000) + 100;
      const current = balance.get(acct.accountNumber)!;
      const newBalance = isCredit ? current + amt : current - amt;
      if (newBalance < acct.minBalance) continue;
      transactions.push({
        txnRef: txnRef(),
        accountNumber: acct.accountNumber,
        type: isCredit ? "DEPOSIT" : "WITHDRAW",
        amount: amt,
        balanceAfter: newBalance,
        description: isCredit ? "Cash deposit" : "ATM withdrawal",
        channel: Math.random() > 0.5 ? "ATM" : "ONLINE",
        status: "SUCCESS",
        createdAt: new Date(nowMs - d * 86400 * 1000 + (t + 1) * 3600 * 1000),
      });
      balance.set(acct.accountNumber, newBalance);
    }
  }

  // ---- Loans (half the customers) + repayments ----
  const loanTypes = ["HOME", "AUTO", "PERSONAL", "EDUCATION", "GOLD"];
  const loans: Prisma.LoanCreateManyInput[] = [];
  const loanRepayments: Prisma.LoanRepaymentCreateManyInput[] = [];
  for (let i = 0; i < customers.length / 2; i++) {
    const c = customers[i];
    const principal = (Math.floor(Math.random() * 50) + 5) * 100000;
    const rate = 7 + Math.random() * 5;
    const tenure = [60, 120, 180, 240][Math.floor(Math.random() * 4)];
    const emi = calculateEMI(principal, rate, tenure);
    const status = i % 3 === 0 ? "PENDING" : i % 3 === 1 ? "APPROVED" : "DISBURSED";
    const linkedAcct = accounts.find((a) => a.customerId === c.id);
    const loanId = uid();

    let outstanding = status === "DISBURSED" ? principal : 0;
    if (status === "DISBURSED") {
      const interestPart = principal * (rate / 100 / 12);
      const numRepays = Math.floor(Math.random() * 3) + 1;
      for (let r = 0; r < numRepays; r++) {
        const principalPart = Math.min(emi - interestPart, outstanding);
        outstanding -= principalPart;
        loanRepayments.push({
          loanId,
          amount: emi,
          principalPart,
          interestPart,
          balanceAfter: outstanding,
          paidAt: new Date(nowMs - (numRepays - r) * 30 * 86400 * 1000),
        });
      }
    }

    loans.push({
      id: loanId,
      loanNumber: generateLoanNo(i + 1),
      customerId: c.id!,
      accountNumber: linkedAcct?.accountNumber ?? null,
      type: loanTypes[i % loanTypes.length],
      principal,
      interestRate: rate,
      tenureMonths: tenure,
      emi,
      outstanding,
      disbursedAt: status === "DISBURSED" ? new Date(nowMs - 30 * 86400 * 1000) : null,
      status,
    });
  }

  // ---- Cards ----
  const cards: Prisma.CardCreateManyInput[] = [];
  for (let i = 0; i < customers.length; i++) {
    const acct = accounts.find((a) => a.customerId === customers[i].id);
    if (!acct) continue;
    const cardType = i % 2 === 0 ? "DEBIT" : "CREDIT";
    cards.push({
      cardNumber: cardNo(),
      customerId: customers[i].id!,
      accountNumber: acct.accountNumber,
      type: cardType,
      network: ["VISA", "MASTERCARD", "RUPAY"][i % 3],
      expiryMonth: (i % 12) + 1,
      expiryYear: year + (i % 5) + 1,
      cvvHash: hashCvv(String(Math.floor(Math.random() * 900 + 100))),
      status: "ACTIVE",
      creditLimit: cardType === "CREDIT" ? 100000 + i * 10000 : 0,
      dailyLimit: 50000,
    });
  }

  // ---- Agents (field collection app users) ----
  const agents = [
    { id: uid(), agentCode: "AGT-2026-0001", name: "Suresh Kumar", phone: "9876500001", email: "suresh@cbs.io", password: agentPw, branchId: branches[0].id, totalCollections: 0, todayCollections: 0 },
    { id: uid(), agentCode: "AGT-2026-0002", name: "Lakshmi Devi", phone: "9876500002", email: "lakshmi@cbs.io", password: agentPw, branchId: branches[1].id, totalCollections: 0, todayCollections: 0 },
    { id: uid(), agentCode: "AGT-2026-0003", name: "Mohammed Ali", phone: "9876500003", email: "mohammed@cbs.io", password: agentPw, branchId: branches[2].id, totalCollections: 0, todayCollections: 0 },
  ];

  // ---- Field collections (Pigmy-style daily deposits) ----
  const fieldCollections: Prisma.FieldCollectionCreateManyInput[] = [];
  for (let i = 0; i < 15; i++) {
    const customer = customers[i % customers.length];
    const acct = accounts.find((a) => a.customerId === customer.id);
    if (!acct) continue;
    const agent = agents[i % agents.length];
    const amount = Math.floor(Math.random() * 1500) + 100;
    fieldCollections.push({
      agentId: agent.id,
      customerId: customer.id!,
      accountNumber: acct.accountNumber,
      amount,
      receiptNo: `RCP-${String(nowMs).slice(-6)}-${String(i + 1).padStart(5, "0")}`,
      location: i % 2 === 0 ? "Doorstep" : "Branch Counter",
      status: "COLLECTED",
      collectedAt: new Date(nowMs - i * 3600 * 1000),
    });
    agent.totalCollections += amount;
    agent.todayCollections += amount;
  }

  // ---- QR codes (merchants with inward collection QR) ----
  const qrCodes: (Prisma.QrCodeCreateManyInput & { id: string })[] = [];
  for (let i = 0; i < 4; i++) {
    const acct = accounts.find((a) => a.customerId === customers[i].id);
    if (!acct) continue;
    const label = ["Ananya Store", "Karthik Clinic", "Sneha Tutorials", "Vikram Motors"][i];
    qrCodes.push({
      id: uid(),
      merchantLabel: label,
      accountNumber: acct.accountNumber,
      upiId: `${label.toLowerCase().replace(/[^a-z]/g, "")}.${acct.accountNumber.slice(-4)}@cbabank`,
      amount: i % 2 === 0 ? Math.floor(Math.random() * 1000) + 100 : null,
      purpose: "Merchant collection",
      scans: Math.floor(Math.random() * 20),
      status: "ACTIVE",
    });
  }

  // ---- QR payments (inward collection) ----
  const qrPayments: Prisma.QrPaymentCreateManyInput[] = [];
  for (let i = 0; i < 6 && qrCodes.length > 0; i++) {
    const qr = qrCodes[i % qrCodes.length];
    const amount = qr.amount ?? Math.floor(Math.random() * 1500) + 100;
    const newBalance = balance.get(qr.accountNumber)! + amount;
    balance.set(qr.accountNumber, newBalance);
    const at = new Date(nowMs - (12 - i) * 3600 * 1000);
    transactions.push({
      txnRef: txnRef(),
      accountNumber: qr.accountNumber,
      type: "QR_IN",
      amount,
      balanceAfter: newBalance,
      description: `QR payment from Payer ${i + 1}`,
      counterparty: `payer${i + 1}@okhdfcbank`,
      channel: "QR",
      status: "SUCCESS",
      createdAt: at,
    });
    qrPayments.push({
      qrId: qr.id,
      accountNumber: qr.accountNumber,
      payerName: `Payer ${i + 1}`,
      payerUpiId: `payer${i + 1}@okhdfcbank`,
      amount,
      refNo: `QRP${nowMs}${i}`,
      status: "SUCCESS",
      direction: "INWARD",
      createdAt: at,
    });
  }

  // ---- NEFT/RTGS/IMPS payment orders ----
  const paymentModes = ["NEFT", "RTGS", "IMPS"];
  const poStatuses = ["PROCESSED", "PROCESSED", "APPROVED", "PENDING", "PROCESSED", "REJECTED", "PROCESSED", "PENDING"];
  const paymentOrders: Prisma.PaymentOrderCreateManyInput[] = [];
  for (let i = 0; i < 8; i++) {
    const customer = customers[i];
    const acct = accounts.find((a) => a.customerId === customer.id);
    if (!acct) continue;
    const mode = paymentModes[i % 3];
    const amount = mode === "RTGS" ? 250000 + i * 50000 : Math.floor(Math.random() * 50000) + 1000;
    const status = poStatuses[i];
    const processedAt = status === "PROCESSED" ? new Date(nowMs - (8 - i) * 1800 * 1000) : null;
    const current = balance.get(acct.accountNumber)!;
    // For PROCESSED payments, also debit the source account
    if (status === "PROCESSED" && current >= amount) {
      const newBal = current - amount;
      balance.set(acct.accountNumber, newBal);
      transactions.push({
        txnRef: txnRef(),
        accountNumber: acct.accountNumber,
        type: `${mode}_OUT`,
        amount,
        balanceAfter: newBal,
        description: `${mode} to Beneficiary ${i + 1}`,
        counterparty: `benef${i + 1}`,
        channel: mode,
        status: "SUCCESS",
        createdAt: processedAt!,
      });
    }
    paymentOrders.push({
      refNo: `PO-${ymd}-${String(i + 1).padStart(6, "0")}`,
      customerId: customer.id!,
      fromAccount: acct.accountNumber,
      beneficiaryName: `Beneficiary ${i + 1}`,
      beneficiaryAccount: String(1000000000000 + i * 111111111111),
      beneficiaryIfsc: ["HDFC0001234", "SBIN0005678", "ICIC0009012"][i % 3],
      amount,
      mode,
      status,
      remarks: i % 2 === 0 ? "Vendor payment" : "Family transfer",
      processedAt,
      utrNo: status === "PROCESSED" ? `UTR${nowMs}${i}` : null,
      createdAt: processedAt ?? new Date(nowMs - (8 - i) * 1800 * 1000),
    });
  }

  // ---- Standing Instructions ----
  const standingInstructions: Prisma.StandingInstructionCreateManyInput[] = [];
  for (let i = 0; i < 4; i++) {
    const customer = customers[i];
    const custAccounts = accounts.filter((a) => a.customerId === customer.id);
    if (custAccounts.length < 2) continue;
    const frequency = ["DAILY", "WEEKLY", "MONTHLY"][i];
    const offsetDays = frequency === "DAILY" ? 1 : frequency === "WEEKLY" ? 7 : 30;
    standingInstructions.push({
      customerId: customer.id!,
      fromAccount: custAccounts[0].accountNumber,
      toAccount: custAccounts[1].accountNumber,
      amount: Math.floor(Math.random() * 5000) + 500,
      frequency,
      dayOfMonth: frequency === "MONTHLY" ? i + 1 : null,
      nextRunAt: new Date(nowMs + offsetDays * 86400 * 1000),
      lastRunAt: i % 2 === 0 ? new Date(nowMs - 86400 * 1000) : null,
      totalRuns: i % 2 === 0 ? Math.floor(Math.random() * 10) + 1 : 0,
      status: "ACTIVE",
    });
  }

  // ---- SMS log sample ----
  const smsTypes = ["TXN_ALERT", "OTP", "BALANCE_ENQUIRY", "MINI_STATEMENT", "KYC_UPDATE", "MARKETING"];
  const smsMessages = [
    "₹5,000 debited via NEFT. Avl Bal updated. -CBS Bank",
    "Your OTP is 123456. Valid for 5 minutes. Do not share.",
    "Your SB A/C balance is ₹1,23,456.00 as on 08-Sep-2026. -CBS Bank",
    "Last 5 transactions: ...see mini statement on app. -CBS Bank",
    "Your KYC is verified. Thank you for banking with us. -CBS Bank",
    "CBS Bank: Now avail personal loans @ 10.5% p.a. Apply on app.",
  ];
  const smsLogs: Prisma.SmsLogCreateManyInput[] = smsMessages.map((message, i) => ({
    customerId: customers[i].id!,
    phone: customers[i].phone,
    message,
    type: smsTypes[i],
    status: "SENT",
    createdAt: new Date(nowMs - i * 3600 * 1000),
  }));

  // ---- Deposit Plans (Pigmy / MIS / FD / RD) ----
  const plans = [
    { code: "PIGMY-DAILY", name: "Daily Pigmy Deposit", type: "PIGMY", minAmount: 10, maxAmount: 1000, interestRate: 4.5, tenureMonths: 12, penaltyRate: 1 },
    { code: "MIS-12M", name: "Monthly Income Scheme 12M", type: "MIS", minAmount: 1000, maxAmount: 1000000, interestRate: 7.5, tenureMonths: 12, penaltyRate: 2 },
    { code: "FD-60M", name: "Fixed Deposit 5 Year", type: "FD", minAmount: 1000, maxAmount: 0, interestRate: 6.5, tenureMonths: 60, penaltyRate: 1.5 },
    { code: "RD-12M", name: "Recurring Deposit 1 Year", type: "RD", minAmount: 100, maxAmount: 50000, interestRate: 5.5, tenureMonths: 12, penaltyRate: 1 },
    { code: "MIS-24M", name: "Monthly Income Scheme 24M", type: "MIS", minAmount: 1000, maxAmount: 1000000, interestRate: 8.0, tenureMonths: 24, penaltyRate: 2 },
  ];

  // ---- Share Capital ----
  const shares: Prisma.ShareCreateManyInput[] = customers.map((c, i) => ({
    shareNo: `SHR-${year}-${String(i + 1).padStart(5, "0")}`,
    customerId: c.id!,
    faceValue: 10,
    quantity: Math.floor(Math.random() * 50) + 5,
    paidValue: 10,
    certificateNo: `CERT-${String(i + 1).padStart(4, "0")}`,
    status: "ACTIVE",
  }));

  // ---- Overdraft facilities ----
  const overdrafts: Prisma.OverdraftCreateManyInput[] = [];
  for (let i = 0; i < 3; i++) {
    const acct = accounts.find((a) => a.customerId === customers[i].id);
    if (!acct) continue;
    overdrafts.push({
      accountNumber: `OD-${year}-${String(i + 1).padStart(5, "0")}`,
      customerId: customers[i].id!,
      linkedAccount: acct.accountNumber,
      sanctionedLimit: (Math.floor(Math.random() * 5) + 1) * 100000,
      drawnAmount: Math.floor(Math.random() * 200000),
      interestRate: 12 + Math.random() * 2,
      status: "ACTIVE",
    });
  }

  // ---- Virtual Accounts ----
  const virtualAccounts = Array.from({ length: 4 }, (_, i) => {
    const vaNo = `VA${String(nowMs).slice(-8)}${i}`;
    return {
      id: uid(),
      virtualAccNo: vaNo,
      customerId: customers[i].id!,
      linkedAccount: null,
      purpose: ["E_COLLECTION", "CORPORATE", "MEMBER_ENROLLMENT"][i % 3],
      upiId: `${vaNo.toLowerCase()}@cbabank`,
      status: "ACTIVE",
    };
  });

  // ---- E-Collection samples ----
  const eCollections: Prisma.ECollectionCreateManyInput[] = Array.from({ length: 5 }, (_, i) => ({
    virtualAccountId: virtualAccounts[i % virtualAccounts.length].id,
    payerName: `Payer ${i + 1}`,
    payerUpiId: `payer${i + 1}@okhdfcbank`,
    amount: Math.floor(Math.random() * 5000) + 100,
    refNo: `EC${nowMs}${i}`,
    status: i % 3 === 0 ? "UNMATCHED" : "MATCHED",
    matched: i % 3 !== 0,
    receivedAt: new Date(nowMs - i * 7200 * 1000),
  }));

  // ---- Member Enrollment ----
  const memberEnrollments: Prisma.MemberEnrollmentCreateManyInput[] = customers.map((c, i) => ({
    enrollmentNo: `ENR-${year}-${String(i + 1).padStart(5, "0")}`,
    customerId: c.id!,
    membershipType: i % 3 === 0 ? "GROUP" : "INDIVIDUAL",
    status: "ACTIVE",
  }));

  // ---- Group Enrollment ----
  const groupData = [
    { name: "Self Help Group Alpha", leader: "Suresh Patel" },
    { name: "Women's Cooperative Beta", leader: "Lakshmi Devi" },
    { name: "Farmers Group Gamma", leader: "Ram Singh" },
  ];
  const groupEnrollments: Prisma.GroupEnrollmentCreateManyInput[] = groupData.map((g, i) => ({
    groupCode: `GRP-${year}-${String(i + 1).padStart(4, "0")}`,
    groupName: g.name,
    leaderName: g.leader,
    memberCount: Math.floor(Math.random() * 15) + 3,
    totalDeposit: Math.floor(Math.random() * 500000) + 50000,
  }));

  // ---- Bank Reconciliation samples ----
  const reconModes = ["NEFT", "IMPS", "RTGS"];
  const bankReconciliations: Prisma.BankReconciliationCreateManyInput[] = Array.from({ length: 10 }, (_, i) => {
    const mode = reconModes[i % 3];
    return {
      bankRefNo: `BNK${String(nowMs).slice(-8)}${i}`,
      amount: mode === "RTGS" ? 250000 + i * 50000 : Math.floor(Math.random() * 50000) + 1000,
      mode,
      direction: i % 4 === 0 ? "OUTWARD" : "INWARD",
      senderName: `Sender ${i + 1}`,
      senderAccount: String(1000000000000 + i * 111111111111),
      senderIfsc: ["HDFC0001234", "SBIN0005678", "ICIC0009012"][i % 3],
      status: i % 3 === 0 ? "UNMATCHED" : "MATCHED",
      matchedTxnRef: i % 3 === 0 ? null : `TXN-MATCH-${i}`,
      matchedAt: i % 3 === 0 ? null : new Date(nowMs - i * 3600 * 1000),
      statementDate: new Date(nowMs - i * 86400 * 1000),
    };
  });

  // ---- SMS Charges ----
  const smsCharges: Prisma.SmsChargeCreateManyInput[] = Array.from({ length: 5 }, (_, i) => {
    const acct = accounts[i % accounts.length];
    return {
      accountNumber: acct.accountNumber,
      customerId: acct.customerId,
      smsCount: Math.floor(Math.random() * 10) + 1,
      amount: Math.floor(Math.random() * 5) + 1,
      chargeDate: new Date(nowMs - i * 86400 * 1000),
    };
  });

  // ---- Designations ----
  const designations = [
    { id: uid(), code: "CEO", name: "Chief Executive Officer", level: 1, description: "Top executive" },
    { id: uid(), code: "MGR", name: "Branch Manager", level: 2, description: "Branch head" },
    { id: uid(), code: "OFF", name: "Officer", level: 3, description: "Banking officer" },
    { id: uid(), code: "CLERK", name: "Clerk", level: 4, description: "Clerical staff" },
    { id: uid(), code: "AGT", name: "Field Agent", level: 5, description: "Door-to-door collection agent" },
  ];

  // ---- Employees ----
  const empNames = ["Rajesh Kumar", "Sunita Reddy", "Anil Gupta", "Meera Krishnan", "Vikram Joshi", "Priya Nair", "Sanjay Patel", "Lakshmi Iyer"];
  const employees = empNames.map((fullName, i) => ({
    id: uid(),
    empCode: `EMP-${year}-${String(i + 1).padStart(4, "0")}`,
    fullName,
    email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@cbs.io`,
    phone: `98765${String(10000 + i).slice(-5)}`,
    designationId: designations[i % designations.length].id,
    branchId: branches[i % branches.length]?.id ?? null,
    basicSalary: [80000, 50000, 35000, 25000, 20000][i % 5],
    hraAllowance: [15000, 12000, 8000, 5000, 3000][i % 5],
    otherAllowance: [10000, 8000, 5000, 3000, 2000][i % 5],
    dateOfJoin: new Date(nowMs - (i + 1) * 90 * 86400 * 1000),
  }));

  // ---- Attendance (today, for all employees) ----
  const attendanceStatuses = ["PRESENT", "PRESENT", "PRESENT", "HALF_DAY", "LEAVE", "PRESENT", "ABSENT", "PRESENT"];
  const attendance: Prisma.AttendanceCreateManyInput[] = employees.map((emp, i) => ({
    employeeId: emp.id,
    date: now,
    status: attendanceStatuses[i % attendanceStatuses.length],
    checkIn: i % 7 !== 0 ? new Date(nowMs - 4 * 3600 * 1000) : null,
    checkOut: i % 5 === 0 ? new Date(nowMs - 1 * 3600 * 1000) : null,
  }));

  // ---- Salary records (this month, for all employees) ----
  const salaries: Prisma.SalaryCreateManyInput[] = employees.map((emp) => {
    const totalEarnings = emp.basicSalary + emp.hraAllowance + emp.otherAllowance;
    const deductions = Math.floor(emp.basicSalary * 0.1); // 10% PF
    return {
      employeeId: emp.id,
      month: now.getMonth() + 1,
      year,
      basicSalary: emp.basicSalary,
      hraAllowance: emp.hraAllowance,
      otherAllowance: emp.otherAllowance,
      totalEarnings,
      deductions,
      netPay: totalEarnings - deductions,
      status: Math.random() > 0.5 ? "PAID" : "CREATED",
      paidAt: Math.random() > 0.5 ? now : null,
    };
  });

  // ---- Gold Loans ----
  const ornamentTypes = ["NECKLACE", "BANGLE", "GOLD_COIN", "RING"];
  const goldStatuses = ["DISBURSED", "PENDING", "DISBURSED", "DISBURSED"];
  const goldLoans: Prisma.GoldLoanCreateManyInput[] = Array.from({ length: 4 }, (_, i) => {
    const grossWeight = Math.floor(Math.random() * 80) + 20;
    const netWeight = grossWeight - Math.floor(Math.random() * 5);
    const purity = [22, 24, 22, 18][i % 4];
    const estimatedValue = (netWeight / 10) * (purity / 24) * 65000;
    const sanctionedAmount = Math.round(estimatedValue * 0.8);
    return {
      loanNumber: `GL-${year}-${String(i + 1).padStart(5, "0")}`,
      customerId: customers[i].id!,
      ornamentType: ornamentTypes[i % 4],
      grossWeight,
      netWeight,
      purity,
      estimatedValue,
      sanctionedAmount,
      interestRate: 12 + Math.random() * 2,
      tenureMonths: 12,
      outstanding: goldStatuses[i] === "DISBURSED" ? sanctionedAmount * 0.7 : 0,
      status: goldStatuses[i],
      appraiserName: "Senior Appraiser",
    };
  });

  // ---- Chart of Accounts ----
  const coa = [
    { code: "1000", name: "Cash in Hand", type: "ASSET", openingBalance: 500000 },
    { code: "1100", name: "Bank with RBI", type: "ASSET", openingBalance: 5000000 },
    { code: "1200", name: "Loans & Advances", type: "ASSET", openingBalance: 2500000 },
    { code: "1500", name: "Fixed Assets", type: "ASSET", openingBalance: 1000000 },
    { code: "2000", name: "Customer Deposits", type: "LIABILITY", openingBalance: 8000000 },
    { code: "2100", name: "Savings Deposits", type: "LIABILITY", openingBalance: 5000000 },
    { code: "2200", name: "Fixed Deposits", type: "LIABILITY", openingBalance: 3000000 },
    { code: "3000", name: "Share Capital", type: "EQUITY", openingBalance: 1000000 },
    { code: "3100", name: "Reserves & Surplus", type: "EQUITY", openingBalance: 500000 },
    { code: "4000", name: "Interest Income", type: "INCOME", openingBalance: 0 },
    { code: "4100", name: "Fee Income", type: "INCOME", openingBalance: 0 },
    { code: "5000", name: "Salary Expense", type: "EXPENSE", openingBalance: 0 },
    { code: "5100", name: "Rent Expense", type: "EXPENSE", openingBalance: 0 },
    { code: "5200", name: "Utilities", type: "EXPENSE", openingBalance: 0 },
  ];

  // ---- Journal Entries (double-entry: debits = credits) ----
  const jeSpecs = [
    { description: "Salary payment for current month", reference: "PAYROLL", lines: [
      { accountCode: "5000", debit: 200000, credit: 0, description: "Salary expense" },
      { accountCode: "1000", debit: 0, credit: 200000, description: "Cash paid" },
    ] },
    { description: "Office rent payment", reference: "RENT", lines: [
      { accountCode: "5100", debit: 50000, credit: 0, description: "Monthly rent" },
      { accountCode: "1000", debit: 0, credit: 50000, description: "Cash paid" },
    ] },
    { description: "Interest received on loans", reference: "INTEREST", lines: [
      { accountCode: "1000", debit: 75000, credit: 0, description: "Cash received" },
      { accountCode: "4000", debit: 0, credit: 75000, description: "Interest income" },
    ] },
  ];
  const journalEntries: Prisma.JournalEntryCreateManyInput[] = [];
  const journalLines: Prisma.JournalLineCreateManyInput[] = [];
  jeSpecs.forEach((spec, i) => {
    const id = uid();
    journalEntries.push({
      id,
      entryNo: `JE-${ymd}-${String(i + 1).padStart(6, "0")}`,
      description: spec.description,
      reference: spec.reference,
      status: "POSTED",
    });
    for (const l of spec.lines) journalLines.push({ journalEntryId: id, ...l });
  });

  // ---- Master Settings ----
  const settings = [
    { key: "MIN_BALANCE_SAVINGS", value: "1000", category: "BANKING", description: "Minimum balance for savings accounts" },
    { key: "MIN_BALANCE_CURRENT", value: "5000", category: "BANKING", description: "Minimum balance for current accounts" },
    { key: "SAVINGS_INTEREST_RATE", value: "3.5", category: "BANKING", description: "Annual interest rate for savings" },
    { key: "FD_INTEREST_RATE", value: "6.5", category: "BANKING", description: "Annual interest rate for FD" },
    { key: "GOLD_RATE_22K", value: "65000", category: "LOAN", description: "Current 22K gold rate per 10g" },
    { key: "GOLD_LOAN_LTV", value: "80", category: "LOAN", description: "Gold loan LTV percentage" },
    { key: "SMS_CHARGE_PER_MSG", value: "0.5", category: "CHARGES", description: "Charge per SMS alert" },
    { key: "NEFT_CHARGE_FLAT", value: "5", category: "CHARGES", description: "Flat NEFT charge" },
    { key: "RTGS_CHARGE_MIN", value: "25", category: "CHARGES", description: "Minimum RTGS charge" },
    { key: "SMS_GATEWAY_PROVIDER", value: "MSG91", category: "SMS", description: "SMS gateway provider" },
    { key: "SMS_GATEWAY_API_KEY", value: "demo-key", category: "SMS", description: "SMS gateway API key" },
    { key: "BANK_NAME", value: "CBS Bank", category: "GENERAL", description: "Bank name" },
    { key: "BANK_CODE", value: "CBSB", category: "GENERAL", description: "Bank IFSC prefix" },
  ];

  // ---- Account Groups ----
  const accountGroups = [
    { id: uid(), name: "Direct Income", type: "INCOME", description: "Interest, fees" },
    { id: uid(), name: "Indirect Income", type: "INCOME", description: "Other income" },
    { id: uid(), name: "Direct Expenses", type: "EXPENDITURE", description: "Salary, rent" },
    { id: uid(), name: "Indirect Expenses", type: "EXPENDITURE", description: "Utilities, misc" },
    { id: uid(), name: "Current Assets", type: "ASSET", description: "Cash, bank" },
    { id: uid(), name: "Fixed Assets", type: "ASSET", description: "Property, equipment" },
    { id: uid(), name: "Current Liabilities", type: "LIABILITY", description: "Payables" },
    { id: uid(), name: "Long-term Liabilities", type: "LIABILITY", description: "Term loans" },
  ];

  // ---- Ledgers ----
  const ledgers = [
    { id: uid(), name: "Cash in Hand", groupId: accountGroups[4].id, openingBalance: 500000 },
    { id: uid(), name: "Bank with RBI", groupId: accountGroups[4].id, openingBalance: 5000000 },
    { id: uid(), name: "Salary Expense", groupId: accountGroups[2].id, openingBalance: 0 },
    { id: uid(), name: "Rent Expense", groupId: accountGroups[3].id, openingBalance: 0 },
    { id: uid(), name: "Interest Income", groupId: accountGroups[0].id, openingBalance: 0 },
    { id: uid(), name: "Fee Income", groupId: accountGroups[1].id, openingBalance: 0 },
    { id: uid(), name: "Office Equipment", groupId: accountGroups[5].id, openingBalance: 1000000 },
    { id: uid(), name: "Customer Deposits", groupId: accountGroups[7].id, openingBalance: 8000000 },
  ];

  // ---- Vendors ----
  const vendorNames = ["ABC Suppliers", "XYZ Technologies", "PQR Office Solutions", "LMN Furniture"];
  const vendors: Prisma.VendorCreateManyInput[] = vendorNames.map((name, i) => ({
    vendorCode: `VND-${year}-${String(i + 1).padStart(4, "0")}`,
    name,
    email: `contact@${name.toLowerCase().replace(/\s+/g, "")}.com`,
    phone: `98765${String(20000 + i).slice(-5)}`,
    address: `${i + 100} Business Park`,
    city: ["Mumbai", "Delhi", "Bangalore", "Pune"][i],
    state: ["Maharashtra", "Delhi", "Karnataka", "Maharashtra"][i],
    pincode: `40000${i + 1}`,
    pan: `ABCDE${String(i + 1).padStart(4, "0")}F`,
    gstin: `27ABCDE${String(i + 1).padStart(4, "0")}F1Z5`,
  }));

  // ---- Vouchers ----
  const voucherSpecs = [
    { type: "PAYMENT", amount: 200000, description: "Salary payment", lines: [
      { ledgerId: ledgers[2].id, debit: 200000, credit: 0 },
      { ledgerId: ledgers[0].id, debit: 0, credit: 200000 },
    ] },
    { type: "PAYMENT", amount: 50000, description: "Office rent", lines: [
      { ledgerId: ledgers[3].id, debit: 50000, credit: 0 },
      { ledgerId: ledgers[0].id, debit: 0, credit: 50000 },
    ] },
    { type: "RECEIPT", amount: 75000, description: "Interest received", lines: [
      { ledgerId: ledgers[0].id, debit: 75000, credit: 0 },
      { ledgerId: ledgers[4].id, debit: 0, credit: 75000 },
    ] },
  ];
  const vouchers: Prisma.VoucherCreateManyInput[] = [];
  const voucherLines: Prisma.VoucherLineCreateManyInput[] = [];
  voucherSpecs.forEach((spec, i) => {
    const id = uid();
    vouchers.push({
      id,
      voucherNo: `V-${ymd}-${String(i + 1).padStart(5, "0")}`,
      type: spec.type,
      date: now,
      amount: spec.amount,
      description: spec.description,
      status: "POSTED",
    });
    for (const l of spec.lines) voucherLines.push({ voucherId: id, ...l });
  });

  // ---- Approval Requests ----
  const reqTypes = ["LOAN_APPROVAL", "PAYMENT_APPROVAL", "KYC_VERIFY", "OD_SANCTION", "GOLD_LOAN", "VENDOR_CREATE"];
  const reqStatuses = ["PENDING", "PENDING", "APPROVED", "PENDING", "REJECTED", "PENDING"];
  const approvalRequests: Prisma.ApprovalRequestCreateManyInput[] = reqTypes.map((type, i) => ({
    requestNo: `REQ-${year}-${String(i + 1).padStart(5, "0")}`,
    type,
    entityId: `demo-entity-${i + 1}`,
    entityName: `${type.replace(/_/g, " ")} #${i + 1}`,
    amount: [500000, 100000, null, 200000, 300000, null][i],
    status: reqStatuses[i],
    decidedAt: reqStatuses[i] !== "PENDING" ? now : null,
  }));

  // ---- Modification Logs ----
  const modEntries = [
    { entity: "CUSTOMER", entityId: "demo-1", fieldName: "phone", oldValue: "9876543210", newValue: "9876543999", reason: "Customer requested phone update" },
    { entity: "ACCOUNT", entityId: "demo-2", fieldName: "minBalance", oldValue: "1000", newValue: "2000", reason: "Policy update" },
    { entity: "LOAN", entityId: "demo-3", fieldName: "interestRate", oldValue: "11.5", newValue: "10.5", reason: "Rate revision" },
    { entity: "VENDOR", entityId: "demo-4", fieldName: "gstin", oldValue: null, newValue: "27ABCDE1234F1Z5", reason: "GST registration obtained" },
  ];

  // Account rows carry the balance that all the sections above settled on.
  const accountRows: Prisma.AccountCreateManyInput[] = accounts.map((a) => ({
    id: a.id,
    accountNumber: a.accountNumber,
    customerId: a.customerId,
    branchId: a.branchId,
    type: a.type,
    balance: balance.get(a.accountNumber)!,
    currency: "INR",
    status: "ACTIVE",
    interestRate: a.interestRate,
    minBalance: a.minBalance,
  }));

  // ---- One batched write, in FK dependency order ----
  await db.$transaction([
    db.$executeRawUnsafe(truncateSql()),
    db.branch.createMany({ data: branches }),
    db.user.createMany({ data: users }),
    db.customer.createMany({ data: customers }),
    db.account.createMany({ data: accountRows }),
    db.transaction.createMany({ data: transactions }),
    db.loan.createMany({ data: loans }),
    db.loanRepayment.createMany({ data: loanRepayments }),
    db.card.createMany({ data: cards }),
    db.agent.createMany({ data: agents }),
    db.fieldCollection.createMany({ data: fieldCollections }),
    db.qrCode.createMany({ data: qrCodes }),
    db.qrPayment.createMany({ data: qrPayments }),
    db.paymentOrder.createMany({ data: paymentOrders }),
    db.standingInstruction.createMany({ data: standingInstructions }),
    db.smsLog.createMany({ data: smsLogs }),
    db.depositPlan.createMany({ data: plans }),
    db.share.createMany({ data: shares }),
    db.overdraft.createMany({ data: overdrafts }),
    db.virtualAccount.createMany({ data: virtualAccounts }),
    db.eCollection.createMany({ data: eCollections }),
    db.memberEnrollment.createMany({ data: memberEnrollments }),
    db.groupEnrollment.createMany({ data: groupEnrollments }),
    db.bankReconciliation.createMany({ data: bankReconciliations }),
    db.smsCharge.createMany({ data: smsCharges }),
    db.designation.createMany({ data: designations }),
    db.employee.createMany({ data: employees }),
    db.attendance.createMany({ data: attendance }),
    db.salary.createMany({ data: salaries }),
    db.goldLoan.createMany({ data: goldLoans }),
    db.chartOfAccount.createMany({ data: coa }),
    db.journalEntry.createMany({ data: journalEntries }),
    db.journalLine.createMany({ data: journalLines }),
    db.masterSetting.createMany({ data: settings }),
    db.accountGroup.createMany({ data: accountGroups }),
    db.ledger.createMany({ data: ledgers }),
    db.vendor.createMany({ data: vendors }),
    db.voucher.createMany({ data: vouchers }),
    db.voucherLine.createMany({ data: voucherLines }),
    db.approvalRequest.createMany({ data: approvalRequests }),
    db.modificationLog.createMany({ data: modEntries }),
    db.auditLog.createMany({ data: [{
      userId: users[0].id,
      action: "SEED",
      entity: "SYSTEM",
      details: "Seeded demo data with all modules (HR, Gold Loan, Accounting, Master Settings, Groups, Ledgers, Vendors, Vouchers, Requests, Modifications)",
    }] }),
  ]);

  return NextResponse.json({
    ok: true,
    seeded: {
      branches: branches.length,
      users: users.length,
      customers: customers.length,
      accounts: accountRows.length,
      transactions: transactions.length,
      loans: loans.length,
      cards: cards.length,
      agents: agents.length,
      fieldCollections: fieldCollections.length,
      paymentOrders: paymentOrders.length,
      qrCodes: qrCodes.length,
      qrPayments: qrPayments.length,
      standingInstructions: standingInstructions.length,
      smsLogs: smsLogs.length,
      depositPlans: plans.length,
      shares: shares.length,
      overdrafts: overdrafts.length,
      virtualAccounts: virtualAccounts.length,
      eCollections: eCollections.length,
      memberEnrollments: memberEnrollments.length,
      groupEnrollments: groupEnrollments.length,
      bankReconciliations: bankReconciliations.length,
      smsCharges: smsCharges.length,
      designations: designations.length,
      employees: employees.length,
      attendanceRecords: attendance.length,
      salaryRecords: salaries.length,
      goldLoans: goldLoans.length,
      chartOfAccounts: coa.length,
      journalEntries: journalEntries.length,
      masterSettings: settings.length,
      accountGroups: accountGroups.length,
      ledgers: ledgers.length,
      vendors: vendors.length,
      vouchers: vouchers.length,
      approvalRequests: approvalRequests.length,
      modificationLogs: modEntries.length,
    },
    logins: [
      { email: "admin@cbs.io", password: "admin123", role: "ADMIN" },
      { email: "manager@cbs.io", password: "manager123", role: "MANAGER" },
      { email: "teller@cbs.io", password: "teller123", role: "TELLER" },
    ],
  });
}
