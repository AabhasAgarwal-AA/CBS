import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const designations = await db.designation.findMany({
    orderBy: { level: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  return NextResponse.json({ designations });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { code, name, level, description } = body as Record<string, unknown>;
  if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 });
  const existing = await db.designation.findUnique({ where: { code: String(code).toUpperCase() } });
  if (existing) return NextResponse.json({ error: "Code already exists" }, { status: 400 });
  const designation = await db.designation.create({
    data: {
      code: String(code).toUpperCase(),
      name: String(name),
      level: Number(level ?? 1),
      description: (description as string) || null,
    },
  });
  await recordAudit({
    userId: user.id,
    action: "DESIGNATION_CREATE",
    entity: "DESIGNATION",
    entityId: designation.id,
    details: `Created designation ${code} - ${name} (level ${level ?? 1})`,
  });
  return NextResponse.json({ designation }, { status: 201 });
}
