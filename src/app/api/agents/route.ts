import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/banking";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const agents = await db.agent.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      branch: { select: { name: true, code: true, city: true } },
      _count: { select: { fieldCollections: true } },
    },
  });
  return NextResponse.json({ agents });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "TELLER") {
    return NextResponse.json({ error: "Only Admin/Manager can create agents" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { name, phone, email, password, branchId } = body as Record<string, unknown>;
  if (!name || !phone || !password) {
    return NextResponse.json({ error: "name, phone, password required" }, { status: 400 });
  }
  const existing = await db.agent.findFirst({ where: { phone: String(phone) } });
  if (existing) return NextResponse.json({ error: "Phone already registered as agent" }, { status: 400 });
  const count = await db.agent.count();
  const agentCode = `AGT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const agent = await db.agent.create({
    data: {
      agentCode,
      name: String(name),
      phone: String(phone),
      email: (email as string) || null,
      password: await hashPassword(String(password)),
      branchId: (branchId as string) || null,
    },
  });
  await recordAudit({
    userId: user.id,
    action: "AGENT_CREATE",
    entity: "AGENT",
    entityId: agent.id,
    details: `Created agent ${agentCode} - ${name}`,
  });
  return NextResponse.json({ agent }, { status: 201 });
}
