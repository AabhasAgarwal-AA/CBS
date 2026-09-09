import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { toNumber } from "@/lib/banking";
import type { Prisma } from "@prisma/client";

type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: {
    accounts: true;
    loans: true;
    cards: true;
    branch: true;
  };
}>;

function serializeCustomer(c: CustomerWithRelations | null) {
  if (!c) return c;
  return {
    ...c,
    annualIncome: c.annualIncome !== null ? toNumber(c.annualIncome) : null,
    accounts: c.accounts?.map((a) => ({
      ...a,
      balance: toNumber(a.balance),
      interestRate: toNumber(a.interestRate),
      minBalance: toNumber(a.minBalance),
    })),
    loans: c.loans?.map((l) => ({
      ...l,
      principal: toNumber(l.principal),
      interestRate: toNumber(l.interestRate),
      emi: toNumber(l.emi),
      outstanding: toNumber(l.outstanding),
    })),
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      accounts: { orderBy: { createdAt: "desc" } },
      loans: { orderBy: { createdAt: "desc" } },
      cards: { orderBy: { createdAt: "desc" } },
      branch: true,
    },
  });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ customer: serializeCustomer(customer) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const allowed = [
    "fullName", "email", "phone", "dob", "gender", "address", "city",
    "state", "pincode", "pan", "aadhaar", "occupation", "annualIncome", "status",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (k === "dob" && body[k]) data[k] = new Date(body[k]);
      else if (k === "annualIncome" && body[k] !== undefined && body[k] !== "")
        data[k] = Number(body[k]);
      else data[k] = body[k];
    }
  }

  const customer = await db.customer.update({ where: { id }, data });
  await recordAudit({
    userId: user.id,
    action: "UPDATE",
    entity: "CUSTOMER",
    entityId: id,
    details: `Updated customer ${customer.customerNo}`,
  });
  return NextResponse.json({ customer });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  // Soft delete: just mark INACTIVE
  const customer = await db.customer.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  await recordAudit({
    userId: user.id,
    action: "DELETE",
    entity: "CUSTOMER",
    entityId: id,
    details: `Deactivated customer ${customer.customerNo}`,
  });
  return NextResponse.json({ ok: true });
}
