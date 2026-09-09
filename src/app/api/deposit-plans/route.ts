import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const plans = await db.depositPlan.findMany({
    orderBy: { type: "asc" },
    include: { _count: { select: { accounts: true } } },
  });
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") return NextResponse.json({ error: "Admin/Manager only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { code, name, type, minAmount, maxAmount, interestRate, tenureMonths, penaltyRate } = body as Record<string, unknown>;
  if (!code || !name || !type || !interestRate || !tenureMonths) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const validTypes = ["PIGMY", "MIS", "FD", "RD"];
  if (!validTypes.includes(type as string)) {
    return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
  }
  const plan = await db.depositPlan.create({
    data: {
      code: String(code).toUpperCase(),
      name: String(name),
      type: type as string,
      minAmount: Number(minAmount ?? 0),
      maxAmount: Number(maxAmount ?? 0),
      interestRate: Number(interestRate),
      tenureMonths: Number(tenureMonths),
      penaltyRate: Number(penaltyRate ?? 0),
    },
  });
  await recordAudit({
    userId: user.id,
    action: "PLAN_CREATE",
    entity: "DEPOSIT_PLAN",
    entityId: plan.id,
    details: `Created ${type} plan ${code} (${name}) @ ${interestRate}% for ${tenureMonths}m`,
  });
  return NextResponse.json({ plan }, { status: 201 });
}
