import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/banking";

export async function GET() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, branch: true, active: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { email, name, role, password, branch } = body as Record<string, unknown>;
  if (!email || !name || !role || !password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!["ADMIN", "MANAGER", "TELLER"].includes(role as string))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email in use" }, { status: 400 });

  const u = await db.user.create({
    data: {
      email: String(email).toLowerCase(),
      name: String(name),
      role: role as string,
      password: await hashPassword(String(password)),
      branch: (branch as string) || null,
    },
    select: { id: true, email: true, name: true, role: true, branch: true, active: true, createdAt: true },
  });
  await recordAudit({
    userId: user.id,
    action: "CREATE",
    entity: "USER",
    entityId: u.id,
    details: `Created user ${u.email} (${u.role})`,
  });
  return NextResponse.json({ user: u }, { status: 201 });
}
