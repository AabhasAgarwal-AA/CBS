import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const accounts = await db.chartOfAccount.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { journalLines: true } } },
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { code, name, type, parentId, openingBalance } = body as Record<string, unknown>;
  if (!code || !name || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const validTypes = ["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"];
  if (!validTypes.includes(String(type))) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  const account = await db.chartOfAccount.create({
    data: {
      code: String(code).toUpperCase(),
      name: String(name),
      type: String(type),
      parentId: (parentId as string) || null,
      openingBalance: Number(openingBalance ?? 0),
    },
  });
  await recordAudit({
    userId: user.id,
    action: "COA_CREATE",
    entity: "CHART_OF_ACCOUNT",
    entityId: account.id,
    details: `Created account ${code} - ${name} (${type})`,
  });
  return NextResponse.json({ account }, { status: 201 });
}
