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
  toNumber,
} from "@/lib/banking";
import { createHash } from "crypto";

function hashMpin(mpin: string): string {
  return createHash("sha256").update(mpin + "::mpin-salt").digest("hex");
}

// POST /api/seed - populates the database with demo data
export async function POST(_req: NextRequest) {
  // wipe
  await db.modificationLog.deleteMany();
  await db.approvalRequest.deleteMany();
  await db.voucherLine.deleteMany();
  await db.voucher.deleteMany();
  await db.vendor.deleteMany();
  await db.ledger.deleteMany();
  await db.accountGroup.deleteMany();
  await db.salary.deleteMany();
  await db.attendance.deleteMany();
  await db.employee.deleteMany();
  await db.designationMenuRight.deleteMany();
  await db.designation.deleteMany();
  await db.goldLoanRelease.deleteMany();
  await db.goldLoan.deleteMany();
  await db.journalLine.deleteMany();
  await db.journalEntry.deleteMany();
  await db.chartOfAccount.deleteMany();
  await db.masterSetting.deleteMany();
  await db.overdraft.deleteMany();
  await db.smsCharge.deleteMany();
  await db.bankReconciliation.deleteMany();
  await db.eCollection.deleteMany();
  await db.virtualAccount.deleteMany();
  await db.memberEnrollment.deleteMany();
  await db.groupEnrollment.deleteMany();
  await db.shareTransfer.deleteMany();
  await db.share.deleteMany();
  await db.depositPlan.deleteMany();
  await db.standingInstruction.deleteMany();
  await db.fieldCollection.deleteMany();
  await db.agent.deleteMany();
  await db.qrPayment.deleteMany();
  await db.qrCode.deleteMany();
  await db.paymentOrder.deleteMany();
  await db.smsLog.deleteMany();
  await db.transaction.deleteMany();
  await db.loanRepayment.deleteMany();
  await db.card.deleteMany();
  await db.loan.deleteMany();
  await db.account.deleteMany();
  await db.customer.deleteMany();
  await db.branch.deleteMany();
  await db.user.deleteMany();
  await db.auditLog.deleteMany();

  // branches
  const branches = await Promise.all([
    db.branch.create({ data: { code: "MUM01", name: "Mumbai Fort Main", city: "Mumbai", address: "Fort, Mumbai", ifsc: "CBSB0MUM01" } }),
    db.branch.create({ data: { code: "DEL01", name: "Delhi Connaught Place", city: "New Delhi", address: "CP, New Delhi", ifsc: "CBSB0DEL01" } }),
    db.branch.create({ data: { code: "BLR01", name: "Bangalore MG Road", city: "Bengaluru", address: "MG Road, Bengaluru", ifsc: "CBSB0BLR01" } }),
  ]);

  // users
  const users = await Promise.all([
    db.user.create({ data: { email: "admin@cbs.io", name: "Aarav Mehta", role: "ADMIN", password: await hashPassword("admin123"), branch: branches[0].code } }),
    db.user.create({ data: { email: "manager@cbs.io", name: "Priya Sharma", role: "MANAGER", password: await hashPassword("manager123"), branch: branches[1].code } }),
    db.user.create({ data: { email: "teller@cbs.io", name: "Rahul Verma", role: "TELLER", password: await hashPassword("teller123"), branch: branches[2].code } }),
  ]);

  // customers
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

  const customers = [];
  for (let i = 0; i < customerData.length; i++) {
    const c = customerData[i];
    const customer = await db.customer.create({
      data: {
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
        kycDate: new Date(),
        status: "ACTIVE",
        mpin: hashMpin("1234"), // demo MPIN — customer mobile app login
        branchId: branches[i % branches.length].id,
      },
    });
    customers.push(customer);
  }

  // accounts - 1-3 per customer
  const types = ["SAVINGS", "CURRENT", "FIXED_DEPOSIT", "RECURRING"];
  const rateByType: Record<string, number> = { SAVINGS: 3.5, CURRENT: 0, FIXED_DEPOSIT: 6.5, RECURRING: 5.5 };
  const minByType: Record<string, number> = { SAVINGS: 1000, CURRENT: 5000, FIXED_DEPOSIT: 10000, RECURRING: 100 };

  const accounts = [];
  // Parallel JS-number cache for balances (since Decimal objects are immutable
  // and we need to mutate balances across multiple seeded transactions)
  const balanceCache = new Map<string, number>();
  for (let i = 0; i < customers.length; i++) {
    const numAccounts = (i % 3) + 1;
    for (let j = 0; j < numAccounts; j++) {
      const type = types[(i + j) % types.length];
      const initial = Math.floor(Math.random() * 900000) + 10000;
      let acctNo = generateAccountNumber();
      const exists = await db.account.findUnique({ where: { accountNumber: acctNo } });
      if (exists) acctNo = generateAccountNumber();
      const acct = await db.account.create({
        data: {
          accountNumber: acctNo,
          customerId: customers[i].id,
          branchId: customers[i].branchId,
          type,
          balance: initial,
          currency: "INR",
          status: "ACTIVE",
          interestRate: rateByType[type],
          minBalance: minByType[type],
        },
      });
      // initial deposit txn
      await db.transaction.create({
        data: {
          txnRef: generateTxnRef(),
          accountNumber: acctNo,
          type: "DEPOSIT",
          amount: initial,
          balanceAfter: initial,
          description: "Initial deposit",
          channel: "TELLER",
          status: "SUCCESS",
        },
      });
      accounts.push(acct);
      balanceCache.set(acct.accountNumber, initial);
    }
  }

  // some random transactions across last 30 days
  const now = new Date();
  for (let d = 30; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const numTxns = Math.floor(Math.random() * 5) + 2;
    for (let t = 0; t < numTxns; t++) {
      const acct = accounts[Math.floor(Math.random() * accounts.length)];
      if (acct.status !== "ACTIVE") continue;
      const isCredit = Math.random() > 0.5;
      const amt = Math.floor(Math.random() * 20000) + 100;
      const type = isCredit ? "DEPOSIT" : "WITHDRAW";
      // Use JS-number balance cache (Decimal objects returned by Prisma are immutable)
      const currentBalance = balanceCache.get(acct.accountNumber) ?? toNumber(acct.balance);
      const minBal = toNumber(acct.minBalance);
      const newBalance = isCredit ? currentBalance + amt : currentBalance - amt;
      if (newBalance < minBal) continue;
      await db.transaction.create({
        data: {
          txnRef: generateTxnRef(),
          accountNumber: acct.accountNumber,
          type,
          amount: amt,
          balanceAfter: newBalance,
          description: isCredit ? "Cash deposit" : "ATM withdrawal",
          channel: Math.random() > 0.5 ? "ATM" : "ONLINE",
          status: "SUCCESS",
          createdAt: day,
        },
      });
      balanceCache.set(acct.accountNumber, newBalance);
      await db.account.update({ where: { id: acct.id }, data: { balance: newBalance } });
    }
  }

  // loans for half the customers
  const loanTypes = ["HOME", "AUTO", "PERSONAL", "EDUCATION", "GOLD"];
  for (let i = 0; i < customers.length / 2; i++) {
    const c = customers[i];
    const principal = (Math.floor(Math.random() * 50) + 5) * 100000;
    const rate = 7 + Math.random() * 5;
    const tenure = [60, 120, 180, 240][Math.floor(Math.random() * 4)];
    const emi = calculateEMI(principal, rate, tenure);
    const status = i % 3 === 0 ? "PENDING" : i % 3 === 1 ? "APPROVED" : "DISBURSED";
    const linkedAcct = accounts.find((a) => a.customerId === c.id);
    const loan = await db.loan.create({
      data: {
        loanNumber: generateLoanNo(i + 1),
        customerId: c.id,
        accountNumber: linkedAcct?.accountNumber ?? null,
        type: loanTypes[i % loanTypes.length],
        principal,
        interestRate: rate,
        tenureMonths: tenure,
        emi,
        outstanding: status === "DISBURSED" ? principal : 0,
        disbursedAt: status === "DISBURSED" ? new Date(Date.now() - 30 * 86400 * 1000) : null,
        status,
      },
    });

    // for disbursed loans, add some repayments
    if (status === "DISBURSED") {
      const interestPart = principal * (rate / 100 / 12);
      let outstanding = principal;
      const numRepays = Math.floor(Math.random() * 3) + 1;
      for (let r = 0; r < numRepays; r++) {
        const principalPart = Math.min(emi - interestPart, outstanding);
        outstanding = outstanding - principalPart;
        await db.loanRepayment.create({
          data: {
            loanId: loan.id,
            amount: emi,
            principalPart,
            interestPart,
            balanceAfter: outstanding,
            paidAt: new Date(Date.now() - (numRepays - r) * 30 * 86400 * 1000),
          },
        });
      }
      await db.loan.update({ where: { id: loan.id }, data: { outstanding } });
    }
  }

  // cards
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const acct = accounts.find((a) => a.customerId === c.id);
    if (!acct) continue;
    const cardType = i % 2 === 0 ? "DEBIT" : "CREDIT";
    const cardNumber = generateCardNumber();
    const cvv = String(Math.floor(Math.random() * 900 + 100));
    await db.card.create({
      data: {
        cardNumber,
        customerId: c.id,
        accountNumber: acct.accountNumber,
        type: cardType,
        network: ["VISA", "MASTERCARD", "RUPAY"][i % 3],
        expiryMonth: ((i % 12) + 1),
        expiryYear: new Date().getFullYear() + (i % 5) + 1,
        cvvHash: hashCvv(cvv),
        status: "ACTIVE",
        creditLimit: cardType === "CREDIT" ? 100000 + i * 10000 : 0,
        dailyLimit: 50000,
      },
    });
  }

  // ---- Agents (Field collection app users) ----
  const agents = await Promise.all([
    db.agent.create({ data: { agentCode: "AGT-2026-0001", name: "Suresh Kumar", phone: "9876500001", email: "suresh@cbs.io", password: await hashPassword("agent123"), branchId: branches[0].id } }),
    db.agent.create({ data: { agentCode: "AGT-2026-0002", name: "Lakshmi Devi", phone: "9876500002", email: "lakshmi@cbs.io", password: await hashPassword("agent123"), branchId: branches[1].id } }),
    db.agent.create({ data: { agentCode: "AGT-2026-0003", name: "Mohammed Ali", phone: "9876500003", email: "mohammed@cbs.io", password: await hashPassword("agent123"), branchId: branches[2].id } }),
  ]);

  // ---- Field collections (Pigmy-style daily deposits) ----
  let fieldCount = 0;
  let fieldTotal = 0;
  for (let i = 0; i < 15; i++) {
    const customer = customers[i % customers.length];
    const acct = accounts.find((a) => a.customerId === customer.id);
    if (!acct) continue;
    const agent = agents[i % agents.length];
    const amount = Math.floor(Math.random() * 1500) + 100;
    const receiptNo = `RCP-${String(Date.now()).slice(-6)}-${String(i + 1).padStart(5, "0")}`;
    await db.fieldCollection.create({
      data: {
        agentId: agent.id,
        customerId: customer.id,
        accountNumber: acct.accountNumber,
        amount,
        receiptNo,
        location: i % 2 === 0 ? "Doorstep" : "Branch Counter",
        status: "COLLECTED",
        collectedAt: new Date(Date.now() - i * 3600 * 1000),
      },
    });
    await db.agent.update({
      where: { id: agent.id },
      data: { totalCollections: { increment: amount }, todayCollections: { increment: amount } },
    });
    fieldCount++;
    fieldTotal += amount;
  }

  // ---- QR codes (merchants with inward collection QR) ----
  const qrCount = 4;
  for (let i = 0; i < qrCount; i++) {
    const customer = customers[i];
    const acct = accounts.find((a) => a.customerId === customer.id);
    if (!acct) continue;
    const label = ["Ananya Store", "Karthik Clinic", "Sneha Tutorials", "Vikram Motors"][i];
    const upiId = `${label.toLowerCase().replace(/[^a-z]/g, "")}.${acct.accountNumber.slice(-4)}@cbabank`;
    await db.qrCode.create({
      data: {
        merchantLabel: label,
        accountNumber: acct.accountNumber,
        upiId,
        amount: i % 2 === 0 ? Math.floor(Math.random() * 1000) + 100 : null,
        purpose: "Merchant collection",
        scans: Math.floor(Math.random() * 20),
        status: "ACTIVE",
      },
    });
  }

  // ---- QR payments (received via QR — inward collection) ----
  const qrCodes = await db.qrCode.findMany();
  for (let i = 0; i < 6; i++) {
    const qr = qrCodes[i % qrCodes.length];
    if (!qr) continue;
    const amount = qr.amount ?? Math.floor(Math.random() * 1500) + 100;
    const acct = await db.account.findUnique({ where: { accountNumber: qr.accountNumber } });
    if (!acct) continue;
    const newBalance = acct.balance + amount;
    await db.account.update({ where: { accountNumber: acct.accountNumber }, data: { balance: newBalance } });
    await db.transaction.create({
      data: {
        txnRef: generateTxnRef(),
        accountNumber: acct.accountNumber,
        type: "QR_IN",
        amount,
        balanceAfter: newBalance,
        description: `QR payment from Payer ${i + 1}`,
        counterparty: `payer${i + 1}@okhdfcbank`,
        channel: "QR",
        status: "SUCCESS",
        createdAt: new Date(Date.now() - i * 7200 * 1000),
      },
    });
    await db.qrPayment.create({
      data: {
        qrId: qr.id,
        accountNumber: acct.accountNumber,
        payerName: `Payer ${i + 1}`,
        payerUpiId: `payer${i + 1}@okhdfcbank`,
        amount,
        refNo: `QRP${Date.now()}${i}`,
        status: "SUCCESS",
        direction: "INWARD",
        createdAt: new Date(Date.now() - i * 7200 * 1000),
      },
    });
  }

  // ---- NEFT/RTGS/IMPS payment orders ----
  const paymentModes = ["NEFT", "RTGS", "IMPS"];
  for (let i = 0; i < 8; i++) {
    const customer = customers[i];
    const acct = accounts.find((a) => a.customerId === customer.id);
    if (!acct) continue;
    const mode = paymentModes[i % 3];
    const amount = mode === "RTGS" ? 250000 + i * 50000 : Math.floor(Math.random() * 50000) + 1000;
    const statuses = ["PROCESSED", "PROCESSED", "APPROVED", "PENDING", "PROCESSED", "REJECTED", "PROCESSED", "PENDING"];
    const status = statuses[i];
    const processedAt = status === "PROCESSED" ? new Date(Date.now() - i * 7200 * 1000) : null;
    const utrNo = status === "PROCESSED" ? `UTR${Date.now()}${i}` : null;
    // For PROCESSED payments, also debit the source account
    if (status === "PROCESSED" && acct.balance >= amount) {
      const newBal = acct.balance - amount;
      await db.account.update({ where: { accountNumber: acct.accountNumber }, data: { balance: newBal } });
      await db.transaction.create({
        data: {
          txnRef: generateTxnRef(),
          accountNumber: acct.accountNumber,
          type: `${mode}_OUT`,
          amount,
          balanceAfter: newBal,
          description: `${mode} to Beneficiary ${i + 1}`,
          counterparty: `benef${i + 1}`,
          channel: mode,
          status: "SUCCESS",
          createdAt: processedAt!,
        },
      });
    }
    await db.paymentOrder.create({
      data: {
        refNo: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(i + 1).padStart(6, "0")}`,
        customerId: customer.id,
        fromAccount: acct.accountNumber,
        beneficiaryName: `Beneficiary ${i + 1}`,
        beneficiaryAccount: String(1000000000000 + i * 111111111111),
        beneficiaryIfsc: ["HDFC0001234", "SBIN0005678", "ICIC0009012"][i % 3],
        amount,
        mode,
        status,
        remarks: i % 2 === 0 ? "Vendor payment" : "Family transfer",
        processedAt,
        utrNo,
        createdAt: new Date(Date.now() - i * 10800 * 1000),
      },
    });
  }

  // ---- Standing Instructions ----
  for (let i = 0; i < 4; i++) {
    const customer = customers[i];
    const custAccounts = accounts.filter((a) => a.customerId === customer.id);
    if (custAccounts.length < 2) continue;
    const from = custAccounts[0];
    const to = custAccounts[1];
    const frequencies = ["DAILY", "WEEKLY", "MONTHLY"];
    const frequency = frequencies[i];
    const amount = Math.floor(Math.random() * 5000) + 500;
    let nextRunAt: Date;
    if (frequency === "DAILY") nextRunAt = new Date(Date.now() + 86400 * 1000);
    else if (frequency === "WEEKLY") nextRunAt = new Date(Date.now() + 7 * 86400 * 1000);
    else nextRunAt = new Date(Date.now() + 30 * 86400 * 1000);
    await db.standingInstruction.create({
      data: {
        customerId: customer.id,
        fromAccount: from.accountNumber,
        toAccount: to.accountNumber,
        amount,
        frequency,
        dayOfMonth: frequency === "MONTHLY" ? (i + 1) : null,
        nextRunAt,
        lastRunAt: i % 2 === 0 ? new Date(Date.now() - 86400 * 1000) : null,
        totalRuns: i % 2 === 0 ? Math.floor(Math.random() * 10) + 1 : 0,
        status: "ACTIVE",
      },
    });
  }

  // ---- SMS log sample ----
  for (let i = 0; i < 6; i++) {
    const customer = customers[i];
    const types = ["TXN_ALERT", "OTP", "BALANCE_ENQUIRY", "MINI_STATEMENT", "KYC_UPDATE", "MARKETING"];
    const messages = [
      "₹5,000 debited via NEFT. Avl Bal updated. -CBS Bank",
      "Your OTP is 123456. Valid for 5 minutes. Do not share.",
      "Your SB A/C balance is ₹1,23,456.00 as on 08-Sep-2026. -CBS Bank",
      "Last 5 transactions: ...see mini statement on app. -CBS Bank",
      "Your KYC is verified. Thank you for banking with us. -CBS Bank",
      "CBS Bank: Now avail personal loans @ 10.5% p.a. Apply on app.",
    ];
    await db.smsLog.create({
      data: {
        customerId: customer.id,
        phone: customer.phone,
        message: messages[i],
        type: types[i],
        status: "SENT",
        createdAt: new Date(Date.now() - i * 3600 * 1000),
      },
    });
  }

  // ---- Deposit Plans (Pigmy / MIS / FD / RD) ----
  const plans = await Promise.all([
    db.depositPlan.create({ data: { code: "PIGMY-DAILY", name: "Daily Pigmy Deposit", type: "PIGMY", minAmount: 10, maxAmount: 1000, interestRate: 4.5, tenureMonths: 12, penaltyRate: 1 } }),
    db.depositPlan.create({ data: { code: "MIS-12M", name: "Monthly Income Scheme 12M", type: "MIS", minAmount: 1000, maxAmount: 1000000, interestRate: 7.5, tenureMonths: 12, penaltyRate: 2 } }),
    db.depositPlan.create({ data: { code: "FD-60M", name: "Fixed Deposit 5 Year", type: "FD", minAmount: 1000, maxAmount: 0, interestRate: 6.5, tenureMonths: 60, penaltyRate: 1.5 } }),
    db.depositPlan.create({ data: { code: "RD-12M", name: "Recurring Deposit 1 Year", type: "RD", minAmount: 100, maxAmount: 50000, interestRate: 5.5, tenureMonths: 12, penaltyRate: 1 } }),
    db.depositPlan.create({ data: { code: "MIS-24M", name: "Monthly Income Scheme 24M", type: "MIS", minAmount: 1000, maxAmount: 1000000, interestRate: 8.0, tenureMonths: 24, penaltyRate: 2 } }),
  ]);

  // ---- Share Capital ----
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const count = await db.share.count();
    const shareNo = `SHR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    await db.share.create({
      data: {
        shareNo,
        customerId: c.id,
        faceValue: 10,
        quantity: Math.floor(Math.random() * 50) + 5,
        paidValue: 10,
        certificateNo: `CERT-${String(i + 1).padStart(4, "0")}`,
        status: "ACTIVE",
      },
    });
  }

  // ---- Overdraft facilities ----
  for (let i = 0; i < 3; i++) {
    const c = customers[i];
    const acct = accounts.find((a) => a.customerId === c.id);
    if (!acct) continue;
    await db.overdraft.create({
      data: {
        accountNumber: `OD-${new Date().getFullYear()}-${String(i + 1).padStart(5, "0")}`,
        customerId: c.id,
        linkedAccount: acct.accountNumber,
        sanctionedLimit: (Math.floor(Math.random() * 5) + 1) * 100000,
        drawnAmount: Math.floor(Math.random() * 200000),
        interestRate: 12 + Math.random() * 2,
        status: "ACTIVE",
      },
    });
  }

  // ---- Virtual Accounts ----
  const vaCount = 4;
  for (let i = 0; i < vaCount; i++) {
    const c = customers[i];
    const vaNo = `VA${Date.now().toString().slice(-8)}${i}`;
    await db.virtualAccount.create({
      data: {
        virtualAccNo: vaNo,
        customerId: c.id,
        linkedAccount: null,
        purpose: ["E_COLLECTION", "CORPORATE", "MEMBER_ENROLLMENT"][i % 3],
        upiId: `${vaNo.toLowerCase()}@cbabank`,
        status: "ACTIVE",
      },
    });
  }

  // ---- E-Collection samples ----
  const vas = await db.virtualAccount.findMany();
  for (let i = 0; i < 5; i++) {
    const va = vas[i % vas.length];
    await db.eCollection.create({
      data: {
        virtualAccountId: va.id,
        payerName: `Payer ${i + 1}`,
        payerUpiId: `payer${i + 1}@okhdfcbank`,
        amount: Math.floor(Math.random() * 5000) + 100,
        refNo: `EC${Date.now()}${i}`,
        status: i % 3 === 0 ? "UNMATCHED" : "MATCHED",
        matched: i % 3 !== 0,
        receivedAt: new Date(Date.now() - i * 7200 * 1000),
      },
    });
  }

  // ---- Member Enrollment ----
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const count = await db.memberEnrollment.count();
    const enrollmentNo = `ENR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    await db.memberEnrollment.create({
      data: {
        enrollmentNo,
        customerId: c.id,
        membershipType: i % 3 === 0 ? "GROUP" : "INDIVIDUAL",
        status: "ACTIVE",
      },
    });
  }

  // ---- Group Enrollment ----
  const groupData = [
    { name: "Self Help Group Alpha", leader: "Suresh Patel" },
    { name: "Women's Cooperative Beta", leader: "Lakshmi Devi" },
    { name: "Farmers Group Gamma", leader: "Ram Singh" },
  ];
  for (let i = 0; i < groupData.length; i++) {
    const count = await db.groupEnrollment.count();
    const groupCode = `GRP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    await db.groupEnrollment.create({
      data: {
        groupCode,
        groupName: groupData[i].name,
        leaderName: groupData[i].leader,
        memberCount: Math.floor(Math.random() * 15) + 3,
        totalDeposit: Math.floor(Math.random() * 500000) + 50000,
      },
    });
  }

  // ---- Bank Reconciliation samples ----
  const reconModes = ["NEFT", "IMPS", "RTGS"];
  for (let i = 0; i < 10; i++) {
    const mode = reconModes[i % 3];
    const amount = mode === "RTGS" ? 250000 + i * 50000 : Math.floor(Math.random() * 50000) + 1000;
    await db.bankReconciliation.create({
      data: {
        bankRefNo: `BNK${Date.now().toString().slice(-8)}${i}`,
        amount,
        mode,
        direction: i % 4 === 0 ? "OUTWARD" : "INWARD",
        senderName: `Sender ${i + 1}`,
        senderAccount: String(1000000000000 + i * 111111111111),
        senderIfsc: ["HDFC0001234", "SBIN0005678", "ICIC0009012"][i % 3],
        status: i % 3 === 0 ? "UNMATCHED" : "MATCHED",
        matchedTxnRef: i % 3 === 0 ? null : `TXN-MATCH-${i}`,
        matchedAt: i % 3 === 0 ? null : new Date(Date.now() - i * 3600 * 1000),
        statementDate: new Date(Date.now() - i * 86400 * 1000),
      },
    });
  }

  // ---- SMS Charges ----
  for (let i = 0; i < 5; i++) {
    const acct = accounts[i % accounts.length];
    if (!acct) continue;
    await db.smsCharge.create({
      data: {
        accountNumber: acct.accountNumber,
        customerId: acct.customerId,
        smsCount: Math.floor(Math.random() * 10) + 1,
        amount: Math.floor(Math.random() * 5) + 1,
        chargeDate: new Date(Date.now() - i * 86400 * 1000),
      },
    });
  }

  // ---- Designations ----
  const designations = await Promise.all([
    db.designation.create({ data: { code: "CEO", name: "Chief Executive Officer", level: 1, description: "Top executive" } }),
    db.designation.create({ data: { code: "MGR", name: "Branch Manager", level: 2, description: "Branch head" } }),
    db.designation.create({ data: { code: "OFF", name: "Officer", level: 3, description: "Banking officer" } }),
    db.designation.create({ data: { code: "CLERK", name: "Clerk", level: 4, description: "Clerical staff" } }),
    db.designation.create({ data: { code: "AGT", name: "Field Agent", level: 5, description: "Door-to-door collection agent" } }),
  ]);

  // ---- Employees ----
  const empNames = ["Rajesh Kumar", "Sunita Reddy", "Anil Gupta", "Meera Krishnan", "Vikram Joshi", "Priya Nair", "Sanjay Patel", "Lakshmi Iyer"];
  for (let i = 0; i < empNames.length; i++) {
    const designation = designations[i % designations.length];
    const count = await db.employee.count();
    const empCode = `EMP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    await db.employee.create({
      data: {
        empCode,
        fullName: empNames[i],
        email: `${empNames[i].toLowerCase().replace(/\s+/g, ".")}@cbs.io`,
        phone: `98765${String(10000 + i).slice(-5)}`,
        designationId: designation.id,
        branchId: branches[i % branches.length]?.id ?? null,
        basicSalary: [80000, 50000, 35000, 25000, 20000][i % 5],
        hraAllowance: [15000, 12000, 8000, 5000, 3000][i % 5],
        otherAllowance: [10000, 8000, 5000, 3000, 2000][i % 5],
        dateOfJoin: new Date(Date.now() - (i + 1) * 90 * 86400 * 1000),
      },
    });
  }

  // ---- Attendance (mark today's attendance for all employees) ----
  const allEmployees = await db.employee.findMany();
  const today = new Date();
  for (let i = 0; i < allEmployees.length; i++) {
    const emp = allEmployees[i];
    const statuses = ["PRESENT", "PRESENT", "PRESENT", "HALF_DAY", "LEAVE", "PRESENT", "ABSENT", "PRESENT"];
    await db.attendance.create({
      data: {
        employeeId: emp.id,
        date: today,
        status: statuses[i % statuses.length],
        checkIn: i % 7 !== 0 ? new Date(today.getTime() - 4 * 3600 * 1000) : null,
        checkOut: i % 5 === 0 ? new Date(today.getTime() - 1 * 3600 * 1000) : null,
      },
    });
  }

  // ---- Salary records (this month for all employees) ----
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  for (const emp of allEmployees) {
    const totalEarnings = emp.basicSalary + emp.hraAllowance + emp.otherAllowance;
    const deductions = Math.floor(emp.basicSalary * 0.1); // 10% PF
    const netPay = totalEarnings - deductions;
    await db.salary.create({
      data: {
        employeeId: emp.id,
        month: currentMonth,
        year: currentYear,
        basicSalary: emp.basicSalary,
        hraAllowance: emp.hraAllowance,
        otherAllowance: emp.otherAllowance,
        totalEarnings,
        deductions,
        netPay,
        status: Math.random() > 0.5 ? "PAID" : "CREATED",
        paidAt: Math.random() > 0.5 ? new Date() : null,
      },
    });
  }

  // ---- Gold Loans ----
  for (let i = 0; i < 4; i++) {
    const c = customers[i];
    const count = await db.goldLoan.count();
    const ornamentTypes = ["NECKLACE", "BANGLE", "GOLD_COIN", "RING"];
    const ornament = ornamentTypes[i % 4];
    const grossWeight = Math.floor(Math.random() * 80) + 20;
    const netWeight = grossWeight - Math.floor(Math.random() * 5);
    const purity = [22, 24, 22, 18][i % 4];
    const goldRate = 65000;
    const estimatedValue = (netWeight / 10) * (purity / 24) * goldRate;
    const sanctionedAmount = Math.round(estimatedValue * 0.8);
    const statuses = ["DISBURSED", "PENDING", "DISBURSED", "DISBURSED"];
    await db.goldLoan.create({
      data: {
        loanNumber: `GL-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`,
        customerId: c.id,
        ornamentType: ornament,
        grossWeight,
        netWeight,
        purity,
        estimatedValue,
        sanctionedAmount,
        interestRate: 12 + Math.random() * 2,
        tenureMonths: 12,
        outstanding: statuses[i] === "DISBURSED" ? sanctionedAmount * 0.7 : 0,
        status: statuses[i],
        appraiserName: "Senior Appraiser",
      },
    });
  }

  // ---- Chart of Accounts ----
  const coa = await Promise.all([
    db.chartOfAccount.create({ data: { code: "1000", name: "Cash in Hand", type: "ASSET", openingBalance: 500000 } }),
    db.chartOfAccount.create({ data: { code: "1100", name: "Bank with RBI", type: "ASSET", openingBalance: 5000000 } }),
    db.chartOfAccount.create({ data: { code: "1200", name: "Loans & Advances", type: "ASSET", openingBalance: 2500000 } }),
    db.chartOfAccount.create({ data: { code: "1500", name: "Fixed Assets", type: "ASSET", openingBalance: 1000000 } }),
    db.chartOfAccount.create({ data: { code: "2000", name: "Customer Deposits", type: "LIABILITY", openingBalance: 8000000 } }),
    db.chartOfAccount.create({ data: { code: "2100", name: "Savings Deposits", type: "LIABILITY", openingBalance: 5000000 } }),
    db.chartOfAccount.create({ data: { code: "2200", name: "Fixed Deposits", type: "LIABILITY", openingBalance: 3000000 } }),
    db.chartOfAccount.create({ data: { code: "3000", name: "Share Capital", type: "EQUITY", openingBalance: 1000000 } }),
    db.chartOfAccount.create({ data: { code: "3100", name: "Reserves & Surplus", type: "EQUITY", openingBalance: 500000 } }),
    db.chartOfAccount.create({ data: { code: "4000", name: "Interest Income", type: "INCOME", openingBalance: 0 } }),
    db.chartOfAccount.create({ data: { code: "4100", name: "Fee Income", type: "INCOME", openingBalance: 0 } }),
    db.chartOfAccount.create({ data: { code: "5000", name: "Salary Expense", type: "EXPENSE", openingBalance: 0 } }),
    db.chartOfAccount.create({ data: { code: "5100", name: "Rent Expense", type: "EXPENSE", openingBalance: 0 } }),
    db.chartOfAccount.create({ data: { code: "5200", name: "Utilities", type: "EXPENSE", openingBalance: 0 } }),
  ]);

  // ---- Journal Entries ----
  const je1 = await db.journalEntry.create({
    data: {
      entryNo: `JE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-000001`,
      description: "Salary payment for current month",
      reference: "PAYROLL",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "5000", debit: 200000, credit: 0, description: "Salary expense" },
          { accountCode: "1000", debit: 0, credit: 200000, description: "Cash paid" },
        ],
      },
    },
  });
  const je2 = await db.journalEntry.create({
    data: {
      entryNo: `JE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-000002`,
      description: "Office rent payment",
      reference: "RENT",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "5100", debit: 50000, credit: 0, description: "Monthly rent" },
          { accountCode: "1000", debit: 0, credit: 50000, description: "Cash paid" },
        ],
      },
    },
  });
  const je3 = await db.journalEntry.create({
    data: {
      entryNo: `JE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-000003`,
      description: "Interest received on loans",
      reference: "INTEREST",
      status: "POSTED",
      lines: {
        create: [
          { accountCode: "1000", debit: 75000, credit: 0, description: "Cash received" },
          { accountCode: "4000", debit: 0, credit: 75000, description: "Interest income" },
        ],
      },
    },
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
  for (const s of settings) {
    await db.masterSetting.create({ data: s });
  }

  // ---- Account Groups ----
  const accountGroups = await Promise.all([
    db.accountGroup.create({ data: { name: "Direct Income", type: "INCOME", description: "Interest, fees" } }),
    db.accountGroup.create({ data: { name: "Indirect Income", type: "INCOME", description: "Other income" } }),
    db.accountGroup.create({ data: { name: "Direct Expenses", type: "EXPENDITURE", description: "Salary, rent" } }),
    db.accountGroup.create({ data: { name: "Indirect Expenses", type: "EXPENDITURE", description: "Utilities, misc" } }),
    db.accountGroup.create({ data: { name: "Current Assets", type: "ASSET", description: "Cash, bank" } }),
    db.accountGroup.create({ data: { name: "Fixed Assets", type: "ASSET", description: "Property, equipment" } }),
    db.accountGroup.create({ data: { name: "Current Liabilities", type: "LIABILITY", description: "Payables" } }),
    db.accountGroup.create({ data: { name: "Long-term Liabilities", type: "LIABILITY", description: "Term loans" } }),
  ]);

  // ---- Ledgers ----
  const ledgers = await Promise.all([
    db.ledger.create({ data: { name: "Cash in Hand", groupId: accountGroups[4].id, openingBalance: 500000 } }),
    db.ledger.create({ data: { name: "Bank with RBI", groupId: accountGroups[4].id, openingBalance: 5000000 } }),
    db.ledger.create({ data: { name: "Salary Expense", groupId: accountGroups[2].id, openingBalance: 0 } }),
    db.ledger.create({ data: { name: "Rent Expense", groupId: accountGroups[3].id, openingBalance: 0 } }),
    db.ledger.create({ data: { name: "Interest Income", groupId: accountGroups[0].id, openingBalance: 0 } }),
    db.ledger.create({ data: { name: "Fee Income", groupId: accountGroups[1].id, openingBalance: 0 } }),
    db.ledger.create({ data: { name: "Office Equipment", groupId: accountGroups[5].id, openingBalance: 1000000 } }),
    db.ledger.create({ data: { name: "Customer Deposits", groupId: accountGroups[7].id, openingBalance: 8000000 } }),
  ]);

  // ---- Vendors ----
  const vendorNames = ["ABC Suppliers", "XYZ Technologies", "PQR Office Solutions", "LMN Furniture"];
  for (let i = 0; i < vendorNames.length; i++) {
    const count = await db.vendor.count();
    await db.vendor.create({
      data: {
        vendorCode: `VND-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
        name: vendorNames[i],
        email: `contact@${vendorNames[i].toLowerCase().replace(/\s+/g, "")}.com`,
        phone: `98765${String(20000 + i).slice(-5)}`,
        address: `${i + 100} Business Park`,
        city: ["Mumbai", "Delhi", "Bangalore", "Pune"][i],
        state: ["Maharashtra", "Delhi", "Karnataka", "Maharashtra"][i],
        pincode: `40000${i + 1}`,
        pan: `ABCDE${String(i + 1).padStart(4, "0")}F`,
        gstin: `27ABCDE${String(i + 1).padStart(4, "0")}F1Z5`,
      },
    });
  }

  // ---- Vouchers ----
  const vNo = (n: number) => `V-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(n).padStart(5, "0")}`;
  await db.voucher.create({
    data: {
      voucherNo: vNo(1), type: "PAYMENT", date: new Date(),
      amount: 200000, description: "Salary payment", status: "POSTED",
      lines: {
        create: [
          { ledgerId: ledgers[2].id, debit: 200000, credit: 0 },
          { ledgerId: ledgers[0].id, debit: 0, credit: 200000 },
        ],
      },
    },
  });
  await db.voucher.create({
    data: {
      voucherNo: vNo(2), type: "PAYMENT", date: new Date(),
      amount: 50000, description: "Office rent", status: "POSTED",
      lines: {
        create: [
          { ledgerId: ledgers[3].id, debit: 50000, credit: 0 },
          { ledgerId: ledgers[0].id, debit: 0, credit: 50000 },
        ],
      },
    },
  });
  await db.voucher.create({
    data: {
      voucherNo: vNo(3), type: "RECEIPT", date: new Date(),
      amount: 75000, description: "Interest received", status: "POSTED",
      lines: {
        create: [
          { ledgerId: ledgers[0].id, debit: 75000, credit: 0 },
          { ledgerId: ledgers[4].id, debit: 0, credit: 75000 },
        ],
      },
    },
  });

  // ---- Approval Requests ----
  const reqTypes = ["LOAN_APPROVAL", "PAYMENT_APPROVAL", "KYC_VERIFY", "OD_SANCTION", "GOLD_LOAN", "VENDOR_CREATE"];
  const reqStatuses = ["PENDING", "PENDING", "APPROVED", "PENDING", "REJECTED", "PENDING"];
  for (let i = 0; i < reqTypes.length; i++) {
    const count = await db.approvalRequest.count();
    const requestNo = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    await db.approvalRequest.create({
      data: {
        requestNo,
        type: reqTypes[i],
        entityId: `demo-entity-${i + 1}`,
        entityName: `${reqTypes[i].replace(/_/g, " ")} #${i + 1}`,
        amount: [500000, 100000, null, 200000, 300000, null][i],
        status: reqStatuses[i],
        decidedAt: reqStatuses[i] !== "PENDING" ? new Date() : null,
      },
    });
  }

  // ---- Modification Logs ----
  const modEntries = [
    { entity: "CUSTOMER", entityId: "demo-1", fieldName: "phone", oldValue: "9876543210", newValue: "9876543999", reason: "Customer requested phone update" },
    { entity: "ACCOUNT", entityId: "demo-2", fieldName: "minBalance", oldValue: "1000", newValue: "2000", reason: "Policy update" },
    { entity: "LOAN", entityId: "demo-3", fieldName: "interestRate", oldValue: "11.5", newValue: "10.5", reason: "Rate revision" },
    { entity: "VENDOR", entityId: "demo-4", fieldName: "gstin", oldValue: null, newValue: "27ABCDE1234F1Z5", reason: "GST registration obtained" },
  ];
  for (const m of modEntries) {
    await db.modificationLog.create({ data: m });
  }

  await db.auditLog.create({
    data: {
      userId: users[0].id,
      action: "SEED",
      entity: "SYSTEM",
      details: "Seeded demo data with all modules (HR, Gold Loan, Accounting, Master Settings, Groups, Ledgers, Vendors, Vouchers, Requests, Modifications)",
    },
  });

  return NextResponse.json({
    ok: true,
    seeded: {
      branches: branches.length,
      users: users.length,
      customers: customers.length,
      accounts: accounts.length,
      loans: await db.loan.count(),
      cards: await db.card.count(),
      agents: agents.length,
      fieldCollections: fieldCount,
      paymentOrders: await db.paymentOrder.count(),
      qrCodes: await db.qrCode.count(),
      qrPayments: await db.qrPayment.count(),
      standingInstructions: await db.standingInstruction.count(),
      smsLogs: await db.smsLog.count(),
      depositPlans: plans.length,
      shares: await db.share.count(),
      overdrafts: await db.overdraft.count(),
      virtualAccounts: await db.virtualAccount.count(),
      eCollections: await db.eCollection.count(),
      memberEnrollments: await db.memberEnrollment.count(),
      groupEnrollments: await db.groupEnrollment.count(),
      bankReconciliations: await db.bankReconciliation.count(),
      smsCharges: await db.smsCharge.count(),
      designations: designations.length,
      employees: await db.employee.count(),
      attendanceRecords: await db.attendance.count(),
      salaryRecords: await db.salary.count(),
      goldLoans: await db.goldLoan.count(),
      chartOfAccounts: coa.length,
      journalEntries: 3,
      masterSettings: settings.length,
      accountGroups: accountGroups.length,
      ledgers: ledgers.length,
      vendors: await db.vendor.count(),
      vouchers: await db.voucher.count(),
      approvalRequests: await db.approvalRequest.count(),
      modificationLogs: await db.modificationLog.count(),
    },
    logins: [
      { email: "admin@cbs.io", password: "admin123", role: "ADMIN" },
      { email: "manager@cbs.io", password: "manager123", role: "MANAGER" },
      { email: "teller@cbs.io", password: "teller123", role: "TELLER" },
    ],
  });
}
