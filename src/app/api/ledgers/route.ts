import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? "";
  const where: Record<string, unknown> = {};
  if (groupId) where.groupId = groupId;
  const ledgers = await db.ledger.findMany({
    where,
    orderBy: { name: "asc" },
    include: { group: { select: { name: true, type: true } } },
  });
  return NextResponse.json({ ledgers });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, groupId, openingBalance, description } = body as Record<string, unknown>;
  if (!name || !groupId) return NextResponse.json({ error: "name and groupId required" }, { status: 400 });
  const existing = await db.ledger.findUnique({ where: { name: String(name) } });
  if (existing) return NextResponse.json({ error: "Ledger name exists" }, { status: 400 });
  const ledger = await db.ledger.create({
    data: {
      name: String(name),
      groupId: String(groupId),
      openingBalance: Number(openingBalance ?? 0),
      currentBalance: Number(openingBalance ?? 0),
      description: (description as string) || null,
    },
    include: { group: true },
  });
  await recordAudit({
    userId: user.id, action: "LEDGER_CREATE", entity: "LEDGER", entityId: ledger.id,
    details: `Created ledger ${name} under ${ledger.group.name} (opening ₹${openingBalance ?? 0})`,
  });
  return NextResponse.json({ ledger }, { status: 201 });
}
