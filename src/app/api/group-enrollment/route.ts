import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const groups = await db.groupEnrollment.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("cbs_token")?.value ?? null;
  const user = getSession(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { groupName, leaderName } = body as Record<string, unknown>;
  if (!groupName || !leaderName) return NextResponse.json({ error: "groupName and leaderName required" }, { status: 400 });
  const count = await db.groupEnrollment.count();
  const groupCode = `GRP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const group = await db.groupEnrollment.create({
    data: {
      groupCode,
      groupName: String(groupName),
      leaderName: String(leaderName),
    },
  });
  await recordAudit({
    userId: user.id,
    action: "GROUP_CREATE",
    entity: "GROUP_ENROLLMENT",
    entityId: group.id,
    details: `Created group ${groupCode} (${groupName})`,
  });
  return NextResponse.json({ group }, { status: 201 });
}
