import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const groups = await db.accountGroup.findMany({
    orderBy: { type: "asc" },
    include: { _count: { select: { ledgers: true } } },
  });
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, type, description } = body as Record<string, unknown>;
  if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 });
  const validTypes = ["INCOME", "EXPENDITURE", "LIABILITY", "ASSET"];
  if (!validTypes.includes(String(type))) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  const existing = await db.accountGroup.findUnique({ where: { name: String(name) } });
  if (existing) return NextResponse.json({ error: "Group name already exists" }, { status: 400 });
  const group = await db.accountGroup.create({
    data: { name: String(name), type: String(type), description: (description as string) || null },
  });
  await recordAudit({
    userId: user.id, action: "GROUP_CREATE", entity: "ACCOUNT_GROUP", entityId: group.id,
    details: `Created group ${name} (${type})`,
  });
  return NextResponse.json({ group }, { status: 201 });
}
