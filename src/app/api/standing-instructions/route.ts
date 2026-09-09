import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const customerId = searchParams.get("customerId") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  const instructions = await db.standingInstruction.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { fullName: true, customerNo: true } } },
  });
  return NextResponse.json({ instructions });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { customerId, fromAccount, toAccount, amount, frequency, dayOfMonth } = body as Record<string, unknown>;
  if (!customerId || !fromAccount || !toAccount || !amount || !frequency) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const validFreq = ["DAILY", "WEEKLY", "MONTHLY"];
  if (!validFreq.includes(String(frequency))) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }
  const amt = Number(amount);
  if (amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (fromAccount === toAccount) {
    return NextResponse.json({ error: "From and To accounts cannot be same" }, { status: 400 });
  }

  // Compute next run time
  const now = new Date();
  let nextRunAt: Date;
  if (frequency === "DAILY") {
    nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else if (frequency === "WEEKLY") {
    nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else {
    // MONTHLY
    const dom = Number(dayOfMonth) || 1;
    if (dom < 1 || dom > 28) {
      return NextResponse.json({ error: "dayOfMonth must be 1-28" }, { status: 400 });
    }
    const next = new Date(now);
    next.setDate(dom);
    next.setMonth(next.getMonth() + (next.getDate() >= dom ? 1 : 0));
    next.setHours(9, 0, 0, 0);
    nextRunAt = next;
  }

  const instr = await db.standingInstruction.create({
    data: {
      customerId: String(customerId),
      fromAccount: String(fromAccount),
      toAccount: String(toAccount),
      amount: amt,
      frequency: String(frequency),
      dayOfMonth: frequency === "MONTHLY" ? Number(dayOfMonth) || 1 : null,
      nextRunAt,
      status: "ACTIVE",
    },
  });
  await recordAudit({
    userId: user.id,
    action: "SI_CREATE",
    entity: "STANDING_INSTRUCTION",
    entityId: instr.id,
    details: `Created ${frequency} SI ₹${amt} from ${fromAccount} to ${toAccount}`,
  });
  return NextResponse.json({ instruction: instr }, { status: 201 });
}
