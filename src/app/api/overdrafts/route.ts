import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const ods = await db.overdraft.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { fullName: true, customerNo: true } } },
  });
  return NextResponse.json({ overdrafts: ods });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") return NextResponse.json({ error: "Admin/Manager only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { customerId, linkedAccount, sanctionedLimit, interestRate } = body as Record<string, unknown>;
  if (!customerId || !linkedAccount || !sanctionedLimit || !interestRate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const acct = await db.account.findUnique({ where: { accountNumber: String(linkedAccount) } });
  if (!acct) return NextResponse.json({ error: "Linked account not found" }, { status: 404 });
  const odNo = `OD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000 + 10000))}`;
  const od = await db.overdraft.create({
    data: {
      accountNumber: odNo,
      customerId: String(customerId),
      linkedAccount: String(linkedAccount),
      sanctionedLimit: Number(sanctionedLimit),
      interestRate: Number(interestRate),
    },
  });
  await recordAudit({
    userId: user.id,
    action: "OD_SANCTION",
    entity: "OVERDRAFT",
    entityId: od.id,
    details: `Sanctioned OD ${odNo} for customer ${customerId}, limit ₹${sanctionedLimit} @ ${interestRate}%`,
  });
  return NextResponse.json({ overdraft: od }, { status: 201 });
}
