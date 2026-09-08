import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateCustomerNo, toNumber } from "@/lib/banking";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
      { customerNo: { contains: q } },
      { pan: { contains: q } },
    ];
  }
  if (status) where.status = status;

  const customers = await db.customer.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { accounts: true, loans: true, cards: true } },
    },
  });
  // Convert Decimal annualIncome to number for JSON serialization
  const out = customers.map((c) => ({
    ...c,
    annualIncome: c.annualIncome !== null ? toNumber(c.annualIncome) : null,
  }));
  return NextResponse.json({ customers: out });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    fullName,
    email,
    phone,
    dob,
    gender,
    address,
    city,
    state,
    pincode,
    pan,
    aadhaar,
    occupation,
    annualIncome,
    branchId,
  } = body as Record<string, unknown>;

  if (!fullName || !phone) {
    return NextResponse.json({ error: "fullName and phone are required" }, { status: 400 });
  }

  const existing = await db.customer.findFirst({ where: { phone: String(phone) } });
  if (existing) {
    return NextResponse.json({ error: "Phone number already registered" }, { status: 400 });
  }

  const count = await db.customer.count();
  const customerNo = generateCustomerNo(count + 1);

  const customer = await db.customer.create({
    data: {
      customerNo,
      fullName: String(fullName),
      email: (email as string) || null,
      phone: String(phone),
      dob: dob ? new Date(dob as string) : null,
      gender: (gender as string) || null,
      address: (address as string) || null,
      city: (city as string) || null,
      state: (state as string) || null,
      pincode: (pincode as string) || null,
      pan: (pan as string) || null,
      aadhaar: (aadhaar as string) || null,
      occupation: (occupation as string) || null,
      annualIncome: annualIncome ? Number(annualIncome) : null,
      branchId: (branchId as string) || null,
    },
  });

  await recordAudit({
    userId: user.id,
    action: "CREATE",
    entity: "CUSTOMER",
    entityId: customer.id,
    details: `Created customer ${customer.customerNo} - ${customer.fullName}`,
  });

  return NextResponse.json({ customer }, { status: 201 });
}
