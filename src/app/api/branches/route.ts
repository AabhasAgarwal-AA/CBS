import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { generateIfsc } from "@/lib/banking";

export async function GET() {
  const branches = await db.branch.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ branches });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, city, address, code } = body as Record<string, unknown>;
  if (!name || !city || !code)
    return NextResponse.json({ error: "name, city, code required" }, { status: 400 });

  const existing = await db.branch.findFirst({ where: { OR: [{ code: String(code) }, { name: String(name) }] } });
  if (existing) return NextResponse.json({ error: "Branch code/name exists" }, { status: 400 });

  const branch = await db.branch.create({
    data: {
      code: String(code),
      name: String(name),
      city: String(city),
      address: (address as string) || null,
      ifsc: generateIfsc("CBSB", String(code)),
    },
  });
  await recordAudit({
    userId: user.id,
    action: "CREATE",
    entity: "BRANCH",
    entityId: branch.id,
    details: `Created branch ${branch.name} (${branch.code})`,
  });
  return NextResponse.json({ branch }, { status: 201 });
}
