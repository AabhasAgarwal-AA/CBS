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

// POST /api/seed - populates the database with demo data
export async function POST(_req: NextRequest) {
  // wipe
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

  await db.auditLog.create({
    data: {
      userId: users[0].id,
      action: "SEED",
      entity: "SYSTEM",
      details: "Seeded demo data",
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
    },
    logins: [
      { email: "admin@cbs.io", password: "admin123", role: "ADMIN" },
      { email: "manager@cbs.io", password: "manager123", role: "MANAGER" },
      { email: "teller@cbs.io", password: "teller123", role: "TELLER" },
    ],
  });
}
